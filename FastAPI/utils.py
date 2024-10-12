import multiprocessing
import os
import re
import uuid
from io import BytesIO
from dotenv import load_dotenv, find_dotenv
from openai import OpenAI
from exa_py import Exa
from pydantic import BaseModel
from typing import BinaryIO, Tuple, List, Optional
import json
from sqlalchemy.orm import Session
from database import Hub, Node, Image, Question, get_db
from consts import INSTRUCTIONS, LEVEL_ONE_PROMPT_SUFFIX, ONE_LINER, INITIAL_PROMPT, SURPRISING, \
    SUGGESTED_QUESTION_PROMPT, L2_OUTPUT

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
exa = Exa(api_key=os.getenv("EXA_API_KEY"))

class Response:
    def __init__(self, text_list: List[str], image_list: List[str]):
        self.text_list = text_list  # List of text
        self.image_list = image_list  # List of BytesIO data


# Search result for Exa
class SearchResult(BaseModel):
    title: str
    url: str
    summary: Optional[str] = None


# Search response for Exa
class ExaSearchResponse(BaseModel):
    results: List[SearchResult]
    total_results: int


def create_assistant_for_file(file: BinaryIO) -> Tuple[str, str]:
    """
    This function creates a file object and uses it to generate an assistant
    with access to the Code Interpreter tool. It also creates a new thread.

    Args:
    file (str): The file path or file content to be uploaded.

    Returns:
    Tuple[str, str]: A tuple containing the thread ID and assistant ID.
    """

    # Upload the file
    uploaded_file = client.files.create(
        file=file,
        purpose='assistants'
    )

    # Create the assistant with the uploaded file and Code Interpreter tool
    assistant = client.beta.assistants.create(
        instructions=INSTRUCTIONS,
        model="gpt-4o",
        tools=[{"type": "code_interpreter"}],
        tool_resources={
            "code_interpreter": {
                "file_ids": [uploaded_file.id]
            }
        }
    )

    # Create a new thread
    thread = client.beta.threads.create()

    # Return thread ID and assistant ID
    return assistant.id, thread.id


def _message_and_wait_for_reply(assistant_id: str, thread_id: str, message: str) -> Response:
    """
    Sends a message to the assistant in a specified thread, waits for the assistant's response,
    and returns the assistant's reply.

    Args:
    assistant_id (str): The ID of the assistant.
    thread_id (str): The ID of the thread to send the message in.
    message (str): The content of the message to send.

    Returns:
    str, bool: The response from the assistant, if it is a file
    """

    # Send a message to the thread
    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=message
    )

    # Run the assistant and wait for the response
    run = client.beta.threads.runs.create_and_poll(
        thread_id=thread_id,
        assistant_id=assistant_id,
    )

    # Check if the run is completed and fetch the messages
    if run.status == 'completed':
        # Retrieve the list of messages from the thread
        messages_page = client.beta.threads.messages.list(
            thread_id=thread_id,
            order="asc"
        )

        # Convert the SyncCursorPage object to a list
        messages = list(messages_page)

        # Return the last message content (assuming the assistant's reply is the last one)
        if messages:
            contents = messages[-1].content
            images = []
            texts = []

            for content in contents:
                if hasattr(content, "image_file"):
                    file_id = content.image_file.file_id
                    resp = client.files.with_raw_response.retrieve_content(file_id)
                    if resp.status_code == 200:
                        images.append(resp.content)
                else:
                    text = content.text.value
                    texts.append(text)

            return Response(text_list=texts, image_list=images)

    raise Exception(f"Failed to receive response for message: {message}")


def _parse_one_liner(one_liner, node):
    try:
        formatted_one_liner = re.sub(r'(\w+):', r'"\1":', one_liner[0])  # Add quotes around keys
        formatted_one_liner = re.sub(r':(\w+)', r':"\1"', formatted_one_liner)  # Add quotes around values
        one_liner_object = json.loads(one_liner)
        node["title"] = one_liner_object["title"]
        if one_liner_object["surprising"] <= 2:
            return None
    except:
        node["title"] = one_liner[0]
        surprising_match = re.search(r'"surprising":\s*(\d+)', one_liner[0])
        if surprising_match and int(surprising_match.group(1)) <= 2:
            return None


def _l1_create_node(hub: Hub, thread_id: str, prompt: str, db: Session = next(get_db())):
    # Process the prompt for the new node
    response = _message_and_wait_for_reply(hub.assistant_id, thread_id, prompt)
    text = "\n".join(response.text_list)

    # Determine the concise title of the node
    one_liner_prompt = ONE_LINER
    if SURPRISING.get("enabled"):
        one_liner_prompt += SURPRISING.get("prompt")

    title = _message_and_wait_for_reply(hub.assistant_id, thread_id, one_liner_prompt).text_list[0]

    # Create the base of the Node in DB
    new_node = Node(
        prompt=prompt,
        text=text,
        title=title,
        thread_id=thread_id,
        hub_id=hub.id
    )

    # Process the images (if any) for the Node
    images = []
    for image_data in response.image_list:
        # Create the image object
        image = Image(data=image_data)

        # Add the image to the session so it gets an id upon commit
        db.add(image)

        # Commit to generate the ID and get the URL
        db.commit()
        db.refresh(image)  # Ensure the ID is generated

        # Generate the URL based on the image ID
        image.generate_url()

        # Commit again to save the URL
        db.commit()

        # Append the image to the new_node's images relationship
        new_node.images.append(image)
        images.append(image)  # Optionally collect them for further processing

    # Get interesting questions for a given Node (if any)
    response = _message_and_wait_for_reply(hub.assistant_id, thread_id, SUGGESTED_QUESTION_PROMPT)
    suggested_questions = re.findall(r'#(.*?)#', response.text_list[0])
    for question_text in suggested_questions:
        question = Question(content=question_text)  # Create a Question object
        new_node.questions.append(question)  # Associate the question with the node

    # Save Node to DB
    db.add(new_node)
    db.commit()


def l1_init(hub: Hub, initial_thread: str):
    # Determine the five initial prompts per node
    response = _message_and_wait_for_reply(hub.assistant_id, initial_thread, INITIAL_PROMPT)
    next_prompts = re.findall(r'#(.*?)#', response.text_list[0])

    # Extract and create threads per node
    prompts_with_threads = [(prompt + LEVEL_ONE_PROMPT_SUFFIX + prompt, client.beta.threads.create().id) for prompt in
                            next_prompts]

    # Run each l1 node creation in parallel
    with multiprocessing.Pool() as pool:
        pool.starmap(_l1_create_node, [
            (hub, thread_id, prompt) for prompt, thread_id in prompts_with_threads
        ])

# New level two prompting using Exa
def create_level_two_node(prev_node: Node):
    # Use the findings from level one to prompt OpenAI for a query that Exa can use, and incorporate Exa prompt guidelines for better query formulation
    level_two_prompt = (
        f"""Our findings about {prev_node.title} suggest the following trends: 
        {prev_node.text}. Now, use create an exa query that used this information.

        Include only relevant trusted sources. Focus on journals or articles that delve into statistical analyses or provide clear empirical evidence.
        
        Example prompt: "Here's a great article on the relationship between {prev_node.title} and its long-term implications:".

        Use the following guide to help craft a prompt as well:
        1. Phrase as Statements: "Here's a great article about X:" works better than "What is X?"
        2. Add Context: Include modifiers like "funny", "academic", or specific websites to narrow results.
        3. End with a Colon: Many effective prompts end with ":", mimicking natural link sharing.
        """
    )

    # Send this prompt to OpenAI to generate a search query for Exa
    generated_query = _message_and_wait_for_reply(prev_node["assistant_id"], prev_node["thread_id"], level_two_prompt)

    # Parse the generated search query
    search_query = generated_query.text_list[0]  # (Assuming first response contains the search query)

    # print(search_query)

    # Use the search query to call Exa's search function and fetch relevant papers
    search_results = exa_search(query=search_query)

    print(search_results)
    return search_results


# Define exa search function
def exa_search(query: str) -> ExaSearchResponse:
    # Perform the Exa search (assumed to return a list of dicts or similar)
    raw_results = exa.search_and_contents(query=query, type='auto', summary=True, num_results=L2_OUTPUT)

    # print("RAW RESULTS ARE:")

    print(raw_results)
    # Example of how you would format the results into the Pydantic model
    formatted_results = [
        SearchResult(
            title=result.title,
            url=result.url,
            summary=result.summary
        )
        for result in raw_results.results
    ]

    return ExaSearchResponse(results=formatted_results, total_results=len(raw_results.results))
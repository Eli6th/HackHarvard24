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
from PIL import Image
import json

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
exa = Exa(api_key=os.getenv("EXA_API_KEY"))


INSTRUCTIONS = """
You will use data as a database for a mind map of data. You will first use this data to perform basic analyses to derive correlations and distributions between different columns (variables) for the data. You will then return these to the user. The user will then ask for more open-ended analysis and to come up with creative meanings behind the data correlations and connections. Do not ask for Follow-up questions, or future directions. Just give the response to the instruction and only the response.
You are an AI Data Scientist focusing on identifying valuable features in datasets and uncovering high-level causal relationships between variables. Techniques to utilize: Correlation Analysis: Compute correlation coefficients for numerical columns to identify relationships. Cross-tabulation: For categorical variables, create contingency tables. Time Series Analysis: Identify trends or seasonal patterns. Combine Columns: Suggest combinations of columns to derive more meaningful features.
"""
INITIAL_PROMPT = "Generate five (don't forget this, it must be FIVE) possible instructions for the dataset specified. Instructions should be unique and precise in nature Each instruction should be delimited by # (dont forget this, must be # before and # after) before and after -- be concise! Each instruction should be different in nature "
ONE_LINER = "Summarize the key findings in one sentence <= 50 characters."

LEVEL_ONE_PROMPT_SUFFIX = "Be precise with your results. Any plots should be made with matplotlib and seaborn and should have clearly defined axes and should not be convoluted by using heat maps and alpha values for appropriate graph types. Plots should use histograms for continuous values, and bar graphs for discrete plots. Aggregation of values should also be used for very volatile data values over time."
LEVEL_TWO_PROMPT = "Combine this knowledge with links from 5 actual papers that will aim to explain these findings. For each resource found, give the name and one sentence describing how it explains the trends. Each block of resource and description should be delimited by # (dont forget this, must be # before and # after) before and after."

# Define exa tools available to our agent
TOOLS = [
    {
        "name": "exa_search",
        "description": "Perform a search query on the web, and retrieve the most relevant URLs/web data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to perform.",
                },
            },
            "required": ["query"],
        },
    }
]

class Response:
    def __init__(self, text_list: List[str], image_list: List[BytesIO]):
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


def save_image_temporarily(image: BytesIO):
    """Save the image to a file with a unique ID in the format ID=DATA."""
    image_id = str(uuid.uuid4())  # Generate a unique ID for the image
    image_data = image.getvalue()  # Get the raw bytes from the BytesIO object

    # Save to a file called 'images', appending ID=DATA format
    with open("images.txt", "a+") as file:
        file.write(f"{image_id}={image_data.hex()}\n")  # Save the image data in hex format

    return image_id


def generate_image_url(image_id: str):
    """Generate a URL to access the image via the FastAPI app."""
    return f"http://localhost:8000/image/{image_id}"


# Example usage of saving image and generating a URL
def handle_image(image: BytesIO):
    image_id = save_image_temporarily(image)
    image_url = generate_image_url(image_id)
    return image_url


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


def message_and_wait_for_reply(assistant_id: str, thread_id: str, message: str) -> Response:
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
                        images.append(BytesIO(resp.content))
                else:
                    text = content.text.value
                    texts.append(text)

            return Response(text_list=texts, image_list=images)

    raise Exception(f"Failed to receive response for message: {message}")


# Function to process each prompt (run in parallel)
def process_prompt_multiprocess(prompt, assistant_id, thread_id):
    print(prompt)
    node = {
        "prompt": prompt,
        "images": None,
        "text": None,
        "title": None
    }

    response = message_and_wait_for_reply(assistant_id, thread_id, prompt)
    node["images"] = [handle_image(image) for image in response.image_list]
    node["text"] = response.text_list
    node["title"] = \
        message_and_wait_for_reply(assistant_id, thread_id, ONE_LINER).text_list[0]
    node["assistant_id"] = assistant_id
    node["thread_id"] = thread_id

    # test out new level_two node
    # create_level_two_node(node)
    return node


def initiate_level_one_multiprocess(
        file: BinaryIO = open(os.path.join(os.path.dirname(__file__), 'usa_rain_prediction.csv'), "rb")):
    assistant_id, thread_id = create_assistant_for_file(file)
    response = message_and_wait_for_reply(assistant_id, thread_id, INITIAL_PROMPT)
    next_prompts = re.findall(r'#(.*?)#', response.text_list[0])
    prompts_with_threads = [(prompt + LEVEL_ONE_PROMPT_SUFFIX + prompt, client.beta.threads.create().id) for prompt in next_prompts]
    # print(prompts_with_threads)
    # Run each prompt in parallel using multiprocessing
    with multiprocessing.Pool() as pool:
        level_one_nodes = pool.starmap(process_prompt_multiprocess,
                                       [(prompt, assistant_id, thread_id) for prompt, thread_id in
                                        prompts_with_threads])

    return json.dumps(level_one_nodes)

# Old level two prompting
# def create_level_two_node(prev_node):
#     print(prev_node)
#     prompt = f"Our findings about title={prev_node['title']}: {prev_node['text']}. {LEVEL_TWO_PROMPT}"
#     text_results = message_and_wait_for_reply(prev_node["assistant_id"], prev_node["thread_id"], prompt).text_list
#     print("Results: ",text_results)
#     return text_results

# New level two prompting using Exa
def create_level_two_node(prev_node):
    
    # Use the findings from level one to prompt OpenAI for a query that Exa can use, and incorporate Exa prompt guidelines for better query formulation
    level_two_prompt = (
        f"""Our findings about {prev_node['title']} suggest the following trends: 
        {prev_node['text']}. Now, use create an exa query that used this information.

        Include only relevant academic papers or trusted sources. Focus on journals or articles that delve into statistical analyses or provide clear empirical evidence.
        
        Example prompt: "Here's a great article on the relationship between {prev_node['title']} and its long-term implications:".

        Use the following guide to help craft a prompt as well:
        1. Phrase as Statements: "Here's a great article about X:" works better than "What is X?"
        2. Add Context: Include modifiers like "funny", "academic", or specific websites to narrow results.
        3. End with a Colon: Many effective prompts end with ":", mimicking natural link sharing.
        """
    )

    # Send this prompt to OpenAI to generate a search query for Exa
    generated_query = message_and_wait_for_reply(prev_node["assistant_id"], prev_node["thread_id"], level_two_prompt)

    # Parse the generated search query
    search_query = generated_query.text_list[0]  # (Assuming first response contains the search query)

    print(search_query)

    # Use the search query to call Exa's search function and fetch relevant papers
    search_results = exa_search(query=search_query)

    return search_results


# Define exa search function
def exa_search(query: str) -> ExaSearchResponse:
    # Perform the Exa search (assumed to return a list of dicts or similar)
    raw_results = exa.search_and_contents(query=query, type='auto', highlights=True)

    print("RAW RESULTS ARE:")
    print(type(raw_results))

    print(raw_results)
    print(dir(raw_results))
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




if __name__ == '__main__':
    level_one_nodes = initiate_level_one_multiprocess()
    print(json.dumps(level_one_nodes))

    for node in level_one_nodes:
        result = create_level_two_node(node)
        print(result)


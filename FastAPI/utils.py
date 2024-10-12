import multiprocessing
import os
import re
import uuid
from io import BytesIO
from dotenv import load_dotenv, find_dotenv
from openai import OpenAI
from pydantic import BaseModel
from typing import BinaryIO, Tuple, List
from PIL import Image
import json

load_dotenv()
client = OpenAI()

INSTRUCTIONS = """
You will use data as a database for a mind map of data. You will first use this data to perform basic analyses to derive correlations and distributions between different columns (variables) for the data. You will then return these to the user. The user will then ask for more open-ended analysis and to come up with creative meanings behind the data correlations and connections.
You are an AI Data Scientist focusing on identifying valuable features in datasets and uncovering high-level causal relationships between variables. Based on the data analysis techniques specified below, generate ten clear and detailed instructions for analyzing the dataset. Techniques to utilize: Correlation Analysis: Compute correlation coefficients for numerical columns to identify relationships. Cross-tabulation: For categorical variables, create contingency tables. Scatter Plots: Visualize relationships between pairs of numerical variables, specifying axes. Time Series Analysis: Identify trends or seasonal patterns. Combine Columns: Suggest combinations of columns to derive more meaningful features.
"""
INITIAL_PROMPT = "Generate five (don't forget this, it must be FIVE) possible instructions for the dataset specified. Each instruction should be delimited by # (dont forget this, must be # before and # after) before and after -- be concise! Each instruction should be different in nature "
ONE_LINER = "Summarize the key findings in one sentence <= 50 characters."

LEVEL_TWO_PROMPT = "Combine this knowledge with links from 5 actual papers that will aim to explain these findings. For each resource found, give the name and one sentence describing how it explains the trends. Each block of resource and description should be delimited by # (dont forget this, must be # before and # after) before and after."


class Response:
    def __init__(self, text_list: List[str], image_list: List[BytesIO]):
        self.text_list = text_list  # List of text
        self.image_list = image_list  # List of BytesIO data


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
    create_level_two_node(node)
    return node


def initiate_level_one_multiprocess(
        file: BinaryIO = open("/Users/emmanuelrassou/Downloads/usa_rain_prediction.csv", "rb")):
    assistant_id, thread_id = create_assistant_for_file(file)
    response = message_and_wait_for_reply(assistant_id, thread_id, INITIAL_PROMPT)
    next_prompts = re.findall(r'#(.*?)#', response.text_list[0])
    prompts_with_threads = [(prompt, client.beta.threads.create().id) for prompt in next_prompts]
    # print(prompts_with_threads)
    # Run each prompt in parallel using multiprocessing
    with multiprocessing.Pool() as pool:
        level_one_nodes = pool.starmap(process_prompt_multiprocess,
                                       [(prompt, assistant_id, thread_id) for prompt, thread_id in
                                        prompts_with_threads])

    return json.dumps(level_one_nodes)

def create_level_two_node(prev_node):
    print(prev_node)
    prompt = f"Our findings about title={prev_node['title']}: {prev_node['text']}. {LEVEL_TWO_PROMPT}"
    text_results = message_and_wait_for_reply(prev_node["assistant_id"], prev_node["thread_id"], prompt).text_list
    print("Results: ",text_results)
    return text_results



if __name__ == '__main__':
    level_one_nodes = initiate_level_one_multiprocess()
    print(json.dumps(level_one_nodes))


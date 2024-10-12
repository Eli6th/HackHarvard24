import os
from dotenv import load_dotenv, find_dotenv
from openai import OpenAI
from pydantic import BaseModel
from typing import BinaryIO, Tuple

load_dotenv()
client = OpenAI()

"""
### Example Use Case
assistant_id, thread_id = create_assistant_for_file(open("some_file.csv", "rb"))
reply = message_and_wait_for_reply(assistant_id, thread_id, "Hello, how are you?")
print(reply)
"""


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
        instructions=os.environ.get("INSTRUCTIONS", ""),
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


def message_and_wait_for_reply(assistant_id: str, thread_id: str, message: str) -> str:
    """
    Sends a message to the assistant in a specified thread, waits for the assistant's response,
    and returns the assistant's reply.

    Args:
    assistant_id (str): The ID of the assistant.
    thread_id (str): The ID of the thread to send the message in.
    message (str): The content of the message to send.

    Returns:
    str: The response from the assistant.
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
            return messages[-1].content[0].text.value

    raise Exception(f"Failed to receive response for message: {message}")
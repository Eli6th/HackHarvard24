import json
from utils import ExaSearchResponse
import threading
import uuid
from io import BytesIO
from typing import BinaryIO, List, Optional
from uuid import UUID

import uvicorn
from database import (Hub, Image, Node, NodeResponse, Session,
                      create_db_and_tables)
from fastapi import (BackgroundTasks, Depends, FastAPI, File, Form,
                     HTTPException, Response, UploadFile)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session as _Session


from utils import l1_init, create_assistant_for_file, create_level_two_node, get_db, ExaSearchResponse, create_level_one_half_node
from database import Session, Hub, Node, NodeResponse, create_db_and_tables, Image, Question

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3001",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    create_db_and_tables()
@app.post("/session/start")
async def start_session(
        background_tasks: BackgroundTasks,
        file: UploadFile = File(...),
        session_id: Optional[UUID] = Form(None),
        db: _Session = Depends(get_db),
):
    """
    Create a new session and hub, or create a new hub for an existing session.
    - `file`: The file to be uploaded and associated with the hub.
    - `session_id`: Optional, if provided a new hub is created for the existing session.

    Curl:
    curl -X POST "http://127.0.0.1:8001/session/start" \
    -F "file=@/Users/benkush/Downloads/usa_rain_prediction_dataset_2024_2025.csv" \
    -H "Content-Type: multipart/form-data"
    """
    file_name = file.filename
    file_content = file.file.read()  # This reads the binary content of the file

    if session_id:
        # Find existing session by session_id
        existing_session = db.query(Session).filter(Session.id == session_id).first()
        if not existing_session:
            raise HTTPException(status_code=404, detail="Session not found")

        assistant_id, initial_thread = create_assistant_for_file(file_content)
        new_hub = Hub(file_name=file_name, assistant_id=assistant_id, session_id=session_id)
        db.add(new_hub)
        db.commit()
        background_tasks.add_task(l1_init, new_hub, initial_thread)
        return {
            "session": session_id,
            "hub": new_hub.id
        }
    else:
        # Create a new session and associate a new hub with it
        new_session = Session()
        assistant_id, initial_thread = create_assistant_for_file(file_content)
        new_hub = Hub(file_name=file_name, assistant_id=assistant_id, session=new_session)
        db.add(new_session)
        db.add(new_hub)
        db.commit()
        background_tasks.add_task(l1_init, new_hub, initial_thread)
        return {
            "session": new_session.id,
            "hub": new_hub.id
        }


@app.get("/hubs/{hub_id}/nodes", response_model=List[NodeResponse])
async def get_hub_nodes(hub_id: str, db: _Session = Depends(get_db)):
    """
    Get all nodes for the given hub ID.
    """
    print(hub_id)
    # Fetch the hub by hub_id
    hub = db.query(Hub).filter(Hub.id == hub_id).first()

    if not hub:
        raise HTTPException(status_code=404, detail="Hub not found")

    # Fetch all nodes associated with this hub
    nodes = db.query(Node).filter(Node.hub_id == hub_id).all()

    # If no nodes are found, return an empty list
    if not nodes:
        nodes = []

    # Serialize and return the nodes
    return nodes

@app.get("/runfull")
async def runfull():
    thread = threading.Thread(target=run_utils_main)
    thread.start()

def run_utils_main():
    # level_one_nodes = initiate_level_one_multiprocess()
    # level_one_nodes = json.loads(level_one_nodes)
    # for node in level_one_nodes:
    #     response = create_level_two_node(node)
    #     print(f"For node {node['title']} generated with prompt {node['prompt']}, we receive the following results:")
    #     for result in response.results:
    #         print(result)
    #         # print(result.title)
    #         # print(result.url)
    #         # print(result.summary)
    #         print()
    return


@app.get("/images/{image_id}")
async def get_image(image_id: str, db: Session = Depends(get_db)):
    # Fetch the image from the database
    image = read_image_from_db(image_id, db)
    if image:
        # If the image data is in hex format, convert it to binary
        if isinstance(image.data, str) and image.data.startswith("0x"):
            image_data = bytes.fromhex(image.data[2:])  # Remove "0x" and convert hex to binary
        else:
            image_data = image.data  # Already binary data

        return Response(content=image_data, media_type="image/png")
    else:
        raise HTTPException(status_code=404, detail="Image not found")


def read_image_from_db(image_id: str, db: Session) -> Image:
    """Read the image from the database by its ID."""
    return db.query(Image).filter(Image.id == image_id).first()


# Example: Starting FastAPI server (for local testing)
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)

from fastapi import Depends, FastAPI, UploadFile, File, Form, HTTPException, Response, BackgroundTasks
from io import BytesIO
from typing import Optional, BinaryIO, List
import uuid
from uuid import UUID
import json
from utils import ExaSearchResponse
import multiprocessing
import uvicorn
from sqlalchemy.orm import Session as _Session

from utils import l1_init, create_assistant_for_file, l2_init, get_db
from database import Session, Hub, Node, NodeResponse, create_db_and_tables, Image

app = FastAPI()

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

@app.post("/l2nodes", response_model=List[NodeResponse])
async def create_level_two_node(l1_node_id: str, db: _Session = Depends(get_db)):
    """
    Create a new level two node and return the response.
    """
    # Retrieve the L1 node from the database
    l1_node = db.query(Node).get(Node.id == l1_node_id)
    
    # FOR DEBUGGING:
    # l1_node = db.query(Node).filter(Node.parent_node_id == None).first()
    
    response = l2_init(l1_node.hub, l1_node)
    nodes = db.query(Node).filter(Node.id.in_(response)).all()

    # Serialize and return the nodes
    return nodes


@app.get("/runfull")
async def runfull():
    # Create a new process using multiprocessing
    process = multiprocessing.Process(target=run_utils_main)
    process.start()

# FOR DEBUGGING
def run_utils_main( db: Session = next(get_db())):
    import requests
    single_node = db.query(Node).filter(Node.parent_node_id == None).first()
    response = requests.post(f"http://localhost:8000/l2nodes", params={"l1_node_id": single_node.id})
    if response.status_code == 200:
        print("L2 node created successfully:", response.json())
    else:
        print("Error creating L2 node:", response.status_code, response.text)
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

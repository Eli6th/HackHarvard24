from fastapi import FastAPI, Response
from io import BytesIO
from PIL import Image
import uvicorn
import os
import uuid
from utils import initiate_level_one_multiprocess

app = FastAPI()



@app.get("/start")
async def start():
    return Response(content=initiate_level_one_multiprocess(), media_type="application/json")

@app.get("/image/{image_id}")
async def get_image(image_id: str):
    # Fetch the image buffer from the storage using the image ID
    image_buffer = read_image_from_file(image_id)
    if image_buffer:
        return Response(content=image_buffer.getvalue(), media_type="image/png")
    else:
        return {"error": "Image not found"}

def read_image_from_file(image_id: str) -> BytesIO:
    """Read the image from the file by its ID."""
    with open("images.txt", "r") as file:
        for line in file:
            stored_id, hex_data = line.strip().split("=")
            if stored_id == image_id:
                image_data = bytes.fromhex(hex_data)
                return BytesIO(image_data)

    return None


# Example: Starting FastAPI server (for local testing)
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

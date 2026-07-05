import os
import shutil
import uuid
from fastapi import UploadFile
from app.config import settings

def save_upload_file(upload_file: UploadFile, sub_folder: str = "") -> str:
    """
    Saves an uploaded file locally and returns its system relative server file path.
    """
    # Create child folder inside uploads if specified
    dest_dir = os.path.join(settings.UPLOAD_DIR, sub_folder)
    os.makedirs(dest_dir, exist_ok=True)

    # Make filename unique
    file_extension = os.path.splitext(upload_file.filename or "")[1]
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    
    file_path = os.path.join(dest_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    # Return standard clean relative web path
    web_path = f"/static/{sub_folder}/{unique_filename}" if sub_folder else f"/static/{unique_filename}"
    return web_path.replace("\\", "/")

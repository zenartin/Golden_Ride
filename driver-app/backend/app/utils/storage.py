import os
import shutil
import uuid
import boto3
from fastapi import UploadFile
from app.config import settings

def save_upload_file(upload_file: UploadFile, sub_folder: str = "") -> str:
    """
    Saves an uploaded file to AWS S3 if configured, else locally.
    Returns the URL or relative web path.
    """
    file_extension = os.path.splitext(upload_file.filename or "")[1]
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    
    # Check if S3 is configured
    if settings.AWS_S3_BUCKET_NAME:
        s3_client = boto3.client('s3', region_name=settings.AWS_REGION)
        s3_key = f"{sub_folder}/{unique_filename}" if sub_folder else unique_filename
        s3_client.upload_fileobj(
            upload_file.file,
            settings.AWS_S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={'ContentType': upload_file.content_type}
        )
        return f"https://{settings.AWS_S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"

    # Fallback to local storage
    dest_dir = os.path.join(settings.UPLOAD_DIR, sub_folder)
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    web_path = f"/static/{sub_folder}/{unique_filename}" if sub_folder else f"/static/{unique_filename}"
    return web_path.replace("\\", "/")

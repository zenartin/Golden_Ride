import boto3
import os
import mimetypes

s3 = boto3.client('s3', region_name='us-east-1')
bucket = 'golden-ride-admin-149751500811'
dist_dir = r'c:\Workspace\Golden_Ride\admin-app\dist'

print(f"Uploading files from {dist_dir} to s3://{bucket}...")

for root, dirs, files in os.walk(dist_dir):
    for file in files:
        file_path = os.path.join(root, file)
        s3_key = os.path.relpath(file_path, dist_dir).replace('\\', '/')
        content_type = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
        if file.endswith('.js'):
            content_type = 'application/javascript'
        if file.endswith('.css'):
            content_type = 'text/css'
        
        print(f"Uploading {s3_key} ({content_type})...")
        s3.upload_file(
            file_path,
            bucket,
            s3_key,
            ExtraArgs={'ContentType': content_type}
        )

print("Upload complete! Website live at:")
print(f"http://{bucket}.s3-website-us-east-1.amazonaws.com")

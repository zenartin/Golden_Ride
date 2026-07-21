import os
import subprocess
import time
import re

# 1. Git push
print("Pushing to git...")
subprocess.run(["git", "add", "."], check=True)
subprocess.run(["git", "commit", "-m", "Deploying latest fixes"], check=False)
subprocess.run(["git", "push"], check=True)

# 2. Terminate old EC2
print("Terminating old EC2 instance...")
subprocess.run(["python", "terminate_ec2.py"], check=True)

# 3. Provision new EC2
print("Provisioning new EC2 instance...")
subprocess.run(["python", "provision_aws.py"], check=True)

# 4. Get New IP from aws_outputs.txt
new_ip = None
with open("aws_outputs.txt", "r") as f:
    for line in f:
        if line.startswith("PUBLIC_IP="):
            new_ip = line.strip().split("=")[1]

if not new_ip:
    print("Error: Could not find new IP!")
    exit(1)

print(f"New IP is: {new_ip}")

# 5. Update URLs in code
files_to_update = [
    r"c:\Workspace\Golden_Ride\admin-app\.env.production",
    r"c:\Workspace\Golden_Ride\admin-app\src\api\client.ts",
    r"c:\Workspace\Golden_Ride\driver-app\eas.json",
    r"c:\Workspace\Golden_Ride\driver-app\src\api\axios.ts",
    r"c:\Workspace\Golden_Ride\user-app\eas.json",
    r"c:\Workspace\Golden_Ride\user-app\src\api\client.ts"
]

ip_pattern = re.compile(r'http://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:8001')
ws_pattern = re.compile(r'ws://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:8001')

for file_path in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        content = ip_pattern.sub(f"http://{new_ip}:8001", content)
        content = ws_pattern.sub(f"ws://{new_ip}:8001", content)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated: {file_path}")

# 6. Build Admin and upload
print("Building and uploading Admin Panel...")
subprocess.run("npm run build", cwd=r"c:\Workspace\Golden_Ride\admin-app", shell=True, check=True)
subprocess.run(["python", "upload_admin.py"], check=True)

# 7. Build Android APKs
print("Building Android APKs...")
subprocess.run(r".\gradlew assembleRelease", cwd=r"c:\Workspace\Golden_Ride\driver-app\android", shell=True, check=True)
subprocess.run(r".\gradlew assembleRelease", cwd=r"c:\Workspace\Golden_Ride\user-app\android", shell=True, check=True)

print("ALL DEPLOYMENT TASKS COMPLETED SUCCESSFULLY!")

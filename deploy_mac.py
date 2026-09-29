import os
import subprocess
import time
import re

base_dir = "/Users/nandagopal/Golden_Ride_Git"

# 1. Git push
print("Pushing to git...")
subprocess.run(["git", "add", "."], cwd=base_dir, check=True)
subprocess.run(["git", "commit", "-m", "Deploying latest backend fixes from Mac"], cwd=base_dir, check=False)
subprocess.run(["git", "push"], cwd=base_dir, check=True)

# 2. Terminate old EC2
print("Terminating old EC2 instance...")
subprocess.run(["python3", "terminate_ec2.py"], cwd=os.path.join(base_dir), check=True)

# 3. Provision new EC2
print("Provisioning new EC2 instance...")
subprocess.run(["python3", "provision_aws.py"], cwd=os.path.join(base_dir), check=True)

# 4. Get New IP from aws_outputs.txt
new_ip = None
with open(os.path.join(base_dir, "aws_outputs.txt"), "r") as f:
    for line in f:
        if line.startswith("PUBLIC_IP="):
            new_ip = line.strip().split("=")[1]

if not new_ip:
    print("Error: Could not find new IP!")
    exit(1)

print(f"New IP is: {new_ip}")

# 5. Update URLs in code
files_to_update = [
    os.path.join(base_dir, "admin-app", ".env.production"),
    os.path.join(base_dir, "admin-app", "src", "api", "client.ts"),
    os.path.join(base_dir, "driver-app", "eas.json"),
    os.path.join(base_dir, "driver-app", "src", "api", "axios.ts"),
    os.path.join(base_dir, "user-app", "eas.json"),
    os.path.join(base_dir, "user-app", "src", "api", "client.ts")
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

print("Deployment completed up to updating IPs on Mac. Skipping Admin upload and Android APK build for now to avoid long build times on agent.")

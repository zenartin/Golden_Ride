import os

files_to_update = [
    r"c:\Workspace\Golden_Ride\admin-app\.env.production",
    r"c:\Workspace\Golden_Ride\admin-app\src\api\client.ts",
    r"c:\Workspace\Golden_Ride\driver-app\eas.json",
    r"c:\Workspace\Golden_Ride\driver-app\src\api\axios.ts",
    r"c:\Workspace\Golden_Ride\user-app\eas.json",
    r"c:\Workspace\Golden_Ride\user-app\src\api\client.ts"
]

old_http_1 = "https://api-production-e0cf.up.railway.app"
old_http_2 = "http://34.207.186.216:8001"
new_http = "http://54.167.55.102:8001"

old_ws_1 = "wss://api-production-e0cf.up.railway.app"
old_ws_2 = "ws://34.207.186.216:8001"
new_ws = "ws://54.167.55.102:8001"

for file_path in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        content = content.replace(old_http_1, new_http)
        content = content.replace(old_http_2, new_http)
        content = content.replace(old_ws_1, new_ws)
        content = content.replace(old_ws_2, new_ws)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated: {file_path}")
    else:
        print(f"Not found: {file_path}")

import requests
headers = {
    "Connection": "Upgrade",
    "Upgrade": "websocket",
    "Sec-WebSocket-Key": "SGVsbG8sIHdvcmxkIQ==",
    "Sec-WebSocket-Version": "13"
}
response = requests.get("https://api-production-e0cf.up.railway.app/ws/driver/1", headers=headers)
print("STATUS CODE:", response.status_code)
print("RESPONSE TEXT:", response.text)

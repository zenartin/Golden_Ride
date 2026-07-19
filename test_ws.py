import asyncio
import websockets
import requests
import json
import base64

BASE_URL = "https://api-production-e0cf.up.railway.app/api"

async def test():
    # Login via OTP
    print("Logging in via OTP...")
    r1 = requests.post(f"{BASE_URL}/auth/otp-request", json={"phone": "9999999999"}, timeout=10)
    r2 = requests.post(f"{BASE_URL}/auth/otp-verify", json={"phone": "9999999999", "otp": "1234"}, timeout=10)
    data = r2.json()
    token = data.get("access_token")
    parts = token.split(".")
    payload = json.loads(base64.b64decode(parts[1] + "=="))
    driver_id = payload.get("sub")
    print(f"Authenticated as driver ID: {driver_id}")

    # Connect WebSocket
    ws_url = f"wss://api-production-e0cf.up.railway.app/ws/driver/{driver_id}?token={token}"
    print(f"Connecting to WebSocket...")
    async with websockets.connect(ws_url) as ws:
        print("WebSocket connection OPEN - SUCCESS!")
        await ws.send(json.dumps({"type": "ping"}))
        pong = await asyncio.wait_for(ws.recv(), timeout=5)
        print(f"Server pong response: {pong}")
        print("WebSocket fully working - drivers will receive ride requests!")

asyncio.run(test())

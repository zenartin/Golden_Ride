from fastapi import FastAPI, WebSocket
import uvicorn
import asyncio
from threading import Thread
import requests

app = FastAPI()

@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Hello")

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8005)

if __name__ == "__main__":
    t = Thread(target=run_server, daemon=True)
    t.start()
    import time
    time.sleep(2)
    response = requests.get("http://127.0.0.1:8005/ws")
    print("STATUS CODE:", response.status_code)

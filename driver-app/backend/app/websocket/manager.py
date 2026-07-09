import json
import logging
from typing import Dict
from fastapi import WebSocket

logger = logging.getLogger("app")

class ConnectionManager:
    def __init__(self):
        self._driver_connections: Dict[int, WebSocket] = {}
        self._user_connections: Dict[int, WebSocket] = {}

    async def connect_driver(self, driver_id: int, websocket: WebSocket):
        await websocket.accept()
        # If there's an existing connection, close it to prevent dangling connections
        if driver_id in self._driver_connections:
            try:
                await self._driver_connections[driver_id].close(code=1000)
            except Exception:
                pass
        self._driver_connections[driver_id] = websocket
        logger.info(f"Driver {driver_id} connected via WebSocket. Total connected drivers: {len(self._driver_connections)}")

    def disconnect_driver(self, driver_id: int):
        if driver_id in self._driver_connections:
            del self._driver_connections[driver_id]
            logger.info(f"Driver {driver_id} disconnected from WebSocket. Remaining: {len(self._driver_connections)}")

    async def connect_user(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id in self._user_connections:
            try:
                await self._user_connections[user_id].close(code=1000)
            except Exception:
                pass
        self._user_connections[user_id] = websocket
        logger.info(f"User {user_id} connected via WebSocket. Total connected users: {len(self._user_connections)}")

    def disconnect_user(self, user_id: int):
        if user_id in self._user_connections:
            del self._user_connections[user_id]
            logger.info(f"User {user_id} disconnected from WebSocket. Remaining: {len(self._user_connections)}")

    def is_driver_connected(self, driver_id: int) -> bool:
        return driver_id in self._driver_connections

    def is_user_connected(self, user_id: int) -> bool:
        return user_id in self._user_connections

    async def send_to_driver(self, driver_id: int, message: dict):
        if driver_id in self._driver_connections:
            websocket = self._driver_connections[driver_id]
            try:
                await websocket.send_text(json.dumps(message))
                return True
            except Exception as e:
                logger.error(f"Error sending message to driver {driver_id} WebSocket: {e}")
                self.disconnect_driver(driver_id)
        return False

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self._user_connections:
            websocket = self._user_connections[user_id]
            try:
                await websocket.send_text(json.dumps(message))
                return True
            except Exception as e:
                logger.error(f"Error sending message to user {user_id} WebSocket: {e}")
                self.disconnect_user(user_id)
        return False

    async def broadcast_to_drivers(self, message: dict):
        disconnected = []
        for driver_id, websocket in list(self._driver_connections.items()):
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to driver {driver_id}: {e}")
                disconnected.append(driver_id)
        
        for d_id in disconnected:
            self.disconnect_driver(d_id)

    async def broadcast_to_users(self, message: dict):
        disconnected = []
        for user_id, websocket in list(self._user_connections.items()):
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to user {user_id}: {e}")
                disconnected.append(user_id)

        for u_id in disconnected:
            self.disconnect_user(u_id)

# Singleton manager instance
manager = ConnectionManager()

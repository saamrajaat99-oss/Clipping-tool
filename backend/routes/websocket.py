import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

from backend.engine.queue_manager import queue_worker

logger = logging.getLogger("websocket")
router = APIRouter(tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Hook queue worker notifications into websocket broadcaster
def on_queue_event(event_type: str, data: dict):
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(
                manager.broadcast({"event": event_type, "data": data}),
                loop
            )
    except Exception:
        pass

queue_worker.register_listener(on_queue_event)

@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep alive and listen for client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        manager.disconnect(websocket)

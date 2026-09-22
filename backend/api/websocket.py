from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import asyncio
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.download_subscriptions: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            if websocket in self.active_connections[client_id]:
                self.active_connections[client_id].remove(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
    
    async def subscribe_to_download(self, websocket: WebSocket, download_id: str):
        if download_id not in self.download_subscriptions:
            self.download_subscriptions[download_id] = set()
        self.download_subscriptions[download_id].add(websocket)
    
    def unsubscribe_from_download(self, websocket: WebSocket, download_id: str):
        if download_id in self.download_subscriptions:
            self.download_subscriptions[download_id].discard(websocket)
            if not self.download_subscriptions[download_id]:
                del self.download_subscriptions[download_id]
    
    async def send_progress(self, download_id: str, progress_data: dict):
        if download_id in self.download_subscriptions:
            disconnected = set()
            for websocket in self.download_subscriptions[download_id]:
                try:
                    await websocket.send_json(progress_data)
                except Exception:
                    disconnected.add(websocket)
            
            for ws in disconnected:
                self.unsubscribe_from_download(ws, download_id)
    
    async def broadcast(self, message: dict):
        for client_id, connections in self.active_connections.items():
            for websocket in connections:
                try:
                    await websocket.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "subscribe":
                download_id = data.get("download_id")
                if download_id:
                    await manager.subscribe_to_download(websocket, download_id)
                    await websocket.send_json({"type": "subscribed", "download_id": download_id})
            elif data.get("type") == "unsubscribe":
                download_id = data.get("download_id")
                if download_id:
                    manager.unsubscribe_from_download(websocket, download_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
    except Exception:
        manager.disconnect(websocket, client_id)
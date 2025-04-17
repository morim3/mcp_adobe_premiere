"""
WebSocket server for MCPAdobe server
Handles real-time communication between the Python server and UXP plugin
"""

import asyncio
import json
import logging
import time
import uuid
import websockets
from typing import Dict, Any, Callable, Optional, List

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WebSocketServer:
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: List[websockets.WebSocketServerProtocol] = []
        self.action_handlers: Dict[str, Callable] = {}
        self._server = None
        self.message_dict: Dict[str, Any] = {}
        self.response_events: Dict[str, asyncio.Event] = {}

    async def _handle_message(self, websocket: websockets.WebSocketServerProtocol, message: str):
        """Handle incoming message from client"""
        try:
            data = json.loads(message)
            if not isinstance(data, dict):
                logger.error(f"Invalid message format: {message}")
                return
                
            logger.info(f"Received message: {data}")
            
            # Handle response from plugin
            if "id" in data and ("result" in data or "error" in data):
                logger.info(f"Received response: {data}")
                # Here you could route responses to waiting handlers
                self.message_dict[data["id"]] = data
                self.response_events[data["id"]].set()
                return

        except json.JSONDecodeError:
            logger.error(f"Invalid JSON: {message}")
        except Exception as e:
            logger.exception("Error handling message:")
    
    # async def _send_response(self, websocket: websockets.WebSocketServerProtocol, message_id: str, result: Any, success: bool = True):
    #     """Send response to client"""
    #     response = {
    #         "id": message_id,
    #         "success": success
    #     }
        
    #     if success:
    #         response["result"] = result
    #     else:
    #         response["error"] = result
            
    #     await websocket.send(json.dumps(response))
    #     logger.debug(f"Sent response: {response}")
    
    
    async def _client_handler(self, websocket: websockets.WebSocketServerProtocol, ):
        """Handle new client connection"""
        self.clients.append(websocket)
        client_id = str(id(websocket))
        logger.info(f"Client connected [id: {client_id}] (total: {len(self.clients)})")
        
        try:
            async for message in websocket:
                await self._handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client connection closed [id: {client_id}]")
        finally:
            self.clients.remove(websocket)
            logger.info(f"Client disconnected [id: {client_id}] (remaining: {len(self.clients)})")
    
    async def wait_for_response(self, message_id: str) -> Any:
        """Wait for a response from the plugin"""
        event = self.response_events[message_id] = asyncio.Event()
        timeout = 10

        try:
            await asyncio.wait_for(event.wait(), timeout=timeout)
            return self.message_dict[message_id]
        finally:
            self.response_events.pop(message_id, None)

    async def send_instruction(self, action: str = "", data: Any = None) -> str:
        """
        Send instruction to plugin
        
        Args:
            client: Specific client to send to, or None for first available
            action: Action to execute on plugin side
            data: Additional data for the action
            
        Returns:
            str: Message ID
        """
        if not self.clients:
            logger.warning("No clients connected, cannot send instruction")
            return ""
            
        target_client = self.clients[-1]
        
        message_id = str(uuid.uuid4())
        message = {
            "id": message_id,
            "action": action,
            "data": data or {}
        }
        
        json_message = json.dumps(message)
        try:
            await target_client.send(json_message)
            logger.info(f"Sent instruction: {action} with id: {message_id}")
        except Exception as e:
            logger.exception("Error sending instruction:")
            raise e
    
        try:
            response = await self.wait_for_response(message_id)
            return response
        except Exception as e:
            logger.exception("Error waiting for response:")
            raise e
        
    async def start(self):
        """Start the WebSocket server"""
        self._server = await websockets.serve(
            self._client_handler, self.host, self.port
        )
        logger.info(f"WebSocket server started at ws://{self.host}:{self.port}")
        
    async def stop(self):
        """Stop the WebSocket server"""
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None
            logger.info("WebSocket server stopped")

# Singleton instance
_server_instance = None

def get_server(host: str = "localhost", port: int = 8765) -> WebSocketServer:
    """Get the global WebSocket server instance"""
    global _server_instance
    if _server_instance is None:
        _server_instance = WebSocketServer(host, port)
    return _server_instance 
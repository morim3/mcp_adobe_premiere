"""
Main entry point for MCPAdobe server
"""

import asyncio
import logging
from typing import Dict, Any, Optional, AsyncIterator
from contextlib import asynccontextmanager

from mcp.server.fastmcp import FastMCP
from websocket_server import get_server, WebSocketServer
from tools import register_premiere_tools

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global state
ws_server: Optional[WebSocketServer] = None

@asynccontextmanager
async def server_lifespan(server: FastMCP) -> AsyncIterator[Dict[str, Any]]:
    """Handle server startup and shutdown."""
    global ws_server
    logger.info("Adobe Premiere Pro MCP Server starting up")
    try:
        # Initialize WebSocket server
        ws_server = get_server(host="localhost", port=8765)
        await ws_server.start()
        logger.info("WebSocket server started")
        yield {"ws_server": ws_server}
    finally:
        if ws_server:
            await ws_server.stop()
            ws_server = None
        logger.info("Adobe Premiere Pro MCP Server shut down")

# Initialize MCP server
mcp = FastMCP(
    "adobe-premiere-mcp-server",
    description="Adobe Premiere Pro integration via Model Context Protocol",
    lifespan=server_lifespan
)

# Register tools
register_premiere_tools(mcp)

# Run the server
if __name__ == "__main__":
    mcp.run(transport='stdio')

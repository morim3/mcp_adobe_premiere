"""
Adobe Premiere Pro MCP Server tools for project, sequence, and media management
"""

import logging
import functools
from typing import Dict, Any, Callable, Optional, TypeVar, Awaitable, Tuple

from websocket_server import get_server

logger = logging.getLogger(__name__)

# Type hint definitions
T = TypeVar('T')
ActionFunction = Callable[..., Awaitable[Tuple[str, Dict[str, Any]]]]

# Action processing decorator
def premiere_action(func: ActionFunction) -> Callable[..., Awaitable[Dict[str, Any]]]:
    """
    Decorator: Handles common processing for Premiere Pro actions
    - Error handling
    - Communication with WebSocket server
    - Response standardization
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs) -> Dict[str, Any]:
        ws_server = get_server()
        if not ws_server:
            return {"success": False, "message": "WebSocket server not initialized"}
        
        try:
            # Execute the original function to get action name and data
            action_name, action_data = await func(*args, **kwargs)
            
            # Send to plugin
            try:
                response = await ws_server.send_instruction(
                    action=action_name, 
                    data=action_data
                )
            except TimeoutError:
                return {"success": False, "message": "Timeout waiting for response from plugin"}
            
            # Process response
            if not response:
                return {"success": False, "message": "No response from plugin"}
            
            logger.info(f"Received response: {response}")
            if "success" in response and response["success"]:
                return {
                    "success": True,
                    "response": response.get("result", {})
                }
            else:
                return {"success": False, "message": response.get("error", "Unknown error")}
                
        except Exception as e:
            logger.exception(f"Error in {func.__name__}:")
            return {"success": False, "message": f"Error in {func.__name__}: {str(e)}"}
    
    return wrapper

# Project management action definitions
class PremiereProjectActions:
    """Implementation of Premiere Pro project-related actions"""
    
    @staticmethod
    @premiere_action
    async def get_active(**_) -> Tuple[str, Dict[str, Any]]:
        """Get active project (extra arguments are ignored)"""
        return "getActiveProject", {}
    
    @staticmethod
    @premiere_action
    async def open_project(path: str, **options) -> Tuple[str, Dict[str, Any]]:
        """Open a project"""
        return "openProject", {"path": path, "options": options}
    
    @staticmethod
    @premiere_action
    async def create_project(path: str, **_) -> Tuple[str, Dict[str, Any]]:
        """Create a new project"""
        return "createProject", {"path": path}
    
    @staticmethod
    @premiere_action
    async def save_project(**_) -> Tuple[str, Dict[str, Any]]:
        """Save the project"""
        return "saveProject", {}
    
    @staticmethod
    @premiere_action
    async def save_project_as(path: str, **_) -> Tuple[str, Dict[str, Any]]:
        """Save the project with a new name"""
        return "saveProjectAs", {"path": path}
    
    @staticmethod
    @premiere_action
    async def close_project(**options) -> Tuple[str, Dict[str, Any]]:
        """Close the project"""
        return "closeProject", {"options": options}

# Sequence management action definitions
class PremiereSequenceActions:
    """Implementation of Premiere Pro sequence-related actions"""
    
    @staticmethod
    @premiere_action
    async def get_active(**_) -> Tuple[str, Dict[str, Any]]:
        """Get active sequence"""
        return "getActiveSequence", {}
    
    @staticmethod
    @premiere_action
    async def create_sequence(name: str, preset_path: Optional[str] = None, **_) -> Tuple[str, Dict[str, Any]]:
        """Create a new sequence"""
        return "createSequence", {"name": name, "presetPath": preset_path}
    
    @staticmethod
    @premiere_action
    async def create_sequence_from_media(
        name: str, 
        clip_project_items: list, 
        target_bin: Optional[str] = None,
        **_
    ) -> Tuple[str, Dict[str, Any]]:
        """Create a new sequence from media"""
        return "createSequenceFromMedia", {
            "name": name, 
            "clipProjectItems": clip_project_items,
            "targetBin": target_bin
        }
    
    @staticmethod
    @premiere_action
    async def set_active_sequence(sequence_id: str, **_) -> Tuple[str, Dict[str, Any]]:
        """Set active sequence"""
        return "setActiveSequence", {"sequenceId": sequence_id}
    
    @staticmethod
    @premiere_action
    async def get_sequence_list(**_) -> Tuple[str, Dict[str, Any]]:
        """Get list of all sequences in the project"""
        return "getSequenceList", {}
    
    @staticmethod
    @premiere_action
    async def get_player_position(**_) -> Tuple[str, Dict[str, Any]]:
        """Get playhead position"""
        return "getPlayerPosition", {}
    
    @staticmethod
    @premiere_action
    async def set_player_position(position, **_) -> Tuple[str, Dict[str, Any]]:
        """Set playhead position"""
        return "setPlayerPosition", {"position": position}

# Media import action definitions
class PremiereMediaActions:
    """Implementation of Premiere Pro media-related actions"""
    
    @staticmethod
    @premiere_action
    async def import_files(
        file_paths: list, 
        suppress_ui: bool = False, 
        target_bin: Optional[str] = None,
        as_numbered_stills: bool = False,
        **_
    ) -> Tuple[str, Dict[str, Any]]:
        """Import files"""
        return "importFiles", {
            "filePaths": file_paths,
            "suppressUI": suppress_ui,
            "targetBin": target_bin,
            "asNumberedStills": as_numbered_stills
        }
    
    @staticmethod
    @premiere_action
    async def import_sequences(
        project_path: str, 
        sequence_ids: list,
        **_
    ) -> Tuple[str, Dict[str, Any]]:
        """Import sequences from another project"""
        return "importSequences", {
            "projectPath": project_path,
            "sequenceIds": sequence_ids
        }
    
    @staticmethod
    @premiere_action
    async def import_ae_comps(
        aep_path: str, 
        comp_names: list, 
        target_bin: Optional[str] = None,
        **_
    ) -> Tuple[str, Dict[str, Any]]:
        """Import After Effects compositions"""
        return "importAEComps", {
            "aepPath": aep_path,
            "compNames": comp_names,
            "targetBin": target_bin
        }
    
    @staticmethod
    @premiere_action
    async def import_all_ae_comps(
        aep_path: str, 
        target_bin: Optional[str] = None,
        **_
    ) -> Tuple[str, Dict[str, Any]]:
        """Import all After Effects compositions"""
        return "importAllAEComps", {
            "aepPath": aep_path,
            "targetBin": target_bin
        }

# Registration with MCP Server
def register_premiere_tools(server: Any) -> None:
    """
    Register Premiere Pro tools with the MCP server
    
    Args:
        server: MCP server instance
    """
    logger.info("Registering Premiere Pro tools")
    
    # Project management tool
    @server.tool()
    async def manage_project(action: str = "get_active", **kwargs) -> Dict[str, Any]:
        """
        Manage Adobe Premiere Pro projects
        
        Args:
            action: Action to execute
                - get_active: Get information about the active project
                - open_project: Open a project (path, options)
                - create_project: Create a new project (path)
                - save_project: Save the project
                - save_project_as: Save the project with a new name (path)
                - close_project: Close the project (options)
            **kwargs: Additional parameters according to the action
            
        Returns:
            Dict[str, Any]: Operation result
        """
        # Convert action name to method name (get_active → get_active)
        method_name = action.lower()
        
        # Action dispatch
        action_method = getattr(PremiereProjectActions, method_name, None)
        if not action_method:
            return {"success": False, "message": f"Unknown project action: {action}"}
            
        return await action_method(**kwargs["kwargs"])
    
    # Sequence management tool
    @server.tool()
    async def manage_sequence(action: str = "get_active", **kwargs) -> Dict[str, Any]:
        """
        Manage Adobe Premiere Pro sequences
        
        Args:
            action: Action to execute
                - get_active: Get information about the active sequence
                - create_sequence: Create a new sequence (name, preset_path)
                - create_sequence_from_media: Create a new sequence from media (name, clip_project_items, target_bin)
                - set_active_sequence: Set active sequence (sequence_id)
                - get_sequence_list: Get list of all sequences in the project
                - get_player_position: Get playhead position
                - set_player_position: Set playhead position (position)
            **kwargs: Additional parameters according to the action
            
        Returns:
            Dict[str, Any]: Operation result
        """
        # Convert action name to method name (get_active → get_active)
        method_name = action.lower()
        
        # Action dispatch
        action_method = getattr(PremiereSequenceActions, method_name, None)
        if not action_method:
            return {"success": False, "message": f"Unknown sequence action: {action}"}
            
        logger.info(f"Executing sequence action: {action} with params: {kwargs['kwargs']}")
        return await action_method(**kwargs["kwargs"])
    
    # Media management tool
    @server.tool()
    async def manage_media(action: str, **kwargs) -> Dict[str, Any]:
        """
        Manage Adobe Premiere Pro media
        
        Args:
            action: Action to execute
                - import_files: Import files (file_paths, suppress_ui, target_bin, as_numbered_stills)
                - import_sequences: Import sequences from another project (project_path, sequence_ids)
                - import_ae_comps: Import AE compositions (aep_path, comp_names, target_bin)
                - import_all_ae_comps: Import all AE compositions (aep_path, target_bin)
            **kwargs: Additional parameters according to the action
            
        Returns:
            Dict[str, Any]: Operation result
        """
        # Convert action name to method name (import_files → import_files)
        method_name = action.lower()
        
        # Action dispatch
        action_method = getattr(PremiereMediaActions, method_name, None)
        if not action_method:
            return {"success": False, "message": f"Unknown media action: {action}"}
            
        return await action_method(**kwargs["kwargs"])
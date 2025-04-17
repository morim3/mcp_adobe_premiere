// import type { premierepro, Project, Sequence } from "../types.d.ts";
const app = require("premierepro") // as premierepro;
/**
 * Adobe Premiere Pro API Extension Module
 * Provides a version with consistent response format
 */

// Standard response format
interface StandardResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute the specified action
 */
export async function executeAction(action: string, data?: any): Promise<StandardResponse> {
    try {
        switch (action) {
            // Project related
            case 'getActiveProject':
                return await getActiveProject();
            case 'openProject':
                return await openProject(data.path, data.options);
            case 'createProject':
                return await createProject(data.path);
            case 'saveProject':
                return await saveProject();
            case 'saveProjectAs':
                return await saveProjectAs(data.path);
            case 'closeProject':
                return await closeProject(data.options);
                
            // Sequence related
            case 'getActiveSequence':
                return await getActiveSequence();
            case 'createSequence':
                return await createSequence(data.name, data.presetPath);
            case 'createSequenceFromMedia':
                return await createSequenceFromMedia(data.name, data.clipProjectItems, data.targetBin);
            case 'setActiveSequence':
                return await setActiveSequence(data.sequenceId);
            case 'getSequenceList':
                return await getSequenceList();
            case 'getPlayerPosition':
                return await getPlayerPosition();
            case 'setPlayerPosition':
                return await setPlayerPosition(data.position);
                
            // Media import related
            case 'importFiles':
                return await importFiles(data.filePaths, data.suppressUI, data.targetBin, data.asNumberedStills);
            case 'importSequences':
                return await importSequences(data.projectPath, data.sequenceIds);
            case 'importAEComps':
                return await importAEComps(data.aepPath, data.compNames, data.targetBin);
            case 'importAllAEComps':
                return await importAllAEComps(data.aepPath, data.targetBin);
                
            default:
                return {
                    success: false,
                    error: `Unknown action: ${action}`
                };
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Wrapper function for error handling
 */
async function safeExecute<T>(callback: () => Promise<T>): Promise<StandardResponse> {
    try {
        const result = await callback();
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error("An error occurred:", error);
        console.error("Error stack trace:\n", error.stack);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * === Project Related Functions ===
 */

/**
 * Get information about the active project
 */
async function getActiveProject(): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        return {
            name: project.name,
            path: project.path,
            id: project.guid.toString()
        };
    });
}

/**
 * Open a project
 */
async function openProject(path: string, options?: any): Promise<StandardResponse> {
    return safeExecute(async () => {
        let openOptions = null;
        
        if (options) {
            openOptions = {};
            if (options.showConvertProjectDialog !== undefined) {
                openOptions.setShowConvertProjectDialog(options.showConvertProjectDialog);
            }
            if (options.showLocateFileDialog !== undefined) {
                openOptions.setShowLocateFileDialog(options.showLocateFileDialog);
            }
            if (options.showWarningDialog !== undefined) {
                openOptions.setShowWarningDialog(options.showWarningDialog);
            }
            if (options.addToMRUList !== undefined) {
                openOptions.setAddToMRUList(options.addToMRUList);
            }
        }
        
        const project = await app.Project.open(path, openOptions);
        return {
            name: project.name,
            path: project.path,
            id: project.guid.toString()
        };
    });
}

/**
 * Create a new project
 */
async function createProject(path: string): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.createProject(path);
        return {
            name: project.name,
            path: project.path,
            id: project.guid.toString()
        };
    });
}

/**
 * Save the active project
 */
async function saveProject(): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const result = await project.save();
        // Always return as an object instead of directly returning the boolean value
        return {
            saved: result
        };
    });
}

/**
 * Save the active project to a specified path
 */
async function saveProjectAs(path: string): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const result = await project.saveAs(path);
        return {
            saved: result,
            path: path
        };
    });
}

/**
 * Close the active project
 */
async function closeProject(options?: any): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        let closeOptions = null;
        
        if (options) {
            closeOptions = {};
            if (options.promptIfDirty !== undefined) {
                closeOptions.setPromptIfDirty(options.promptIfDirty);
            }
            if (options.showCancelButton !== undefined) {
                closeOptions.setShowCancelButton(options.showCancelButton);
            }
            if (options.isAppBeingPreparedToQuit !== undefined) {
                closeOptions.setIsAppBeingPreparedToQuit(options.isAppBeingPreparedToQuit);
            }
            if (options.saveWorkspace !== undefined) {
                closeOptions.setSaveWorkspace(options.saveWorkspace);
            }
        }
        
        const result = await project.close(closeOptions);
        return {
            closed: result
        };
    });
}

/**
 * === Sequence Related Functions ===
 */

/**
 * Get information about the active sequence
 */
async function getActiveSequence(): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const sequence = await project.getActiveSequence();
        if (!sequence) {
            throw new Error('No active sequence');
        }
        
        return {
            name: sequence.name,
            id: sequence.guid.toString(),
            videoTrackCount: await sequence.getVideoTrackCount(),
            audioTrackCount: await sequence.getAudioTrackCount(),
            captionTrackCount: await sequence.getCaptionTrackCount()
        };
    });
}

/**
 * Create a new sequence
 */
async function createSequence(name: string, presetPath?: string): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const sequence = await project.createSequence(name, presetPath);
        return {
            name: sequence.name,
            id: sequence.guid.toString()
        };
    });
}

/**
 * Create a sequence from selected media
 */
async function createSequenceFromMedia(name: string, clipProjectItems: any[], targetBin?: any): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const sequence = await project.createSequenceFromMedia(name, clipProjectItems, targetBin);
        return {
            name: sequence.name,
            id: sequence.guid.toString()
        };
    });
}

/**
 * Set a sequence as active
 */
async function setActiveSequence(sequenceId: string): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        // Create Guid object
        console.debug("[DEBUG] sequenceId:", sequenceId);
        const guid = app.Guid.fromString(sequenceId);
        if (!guid) {
            throw new Error(`Invalid sequence ID: ${sequenceId}`);
        }
        
        console.debug("[DEBUG] guid:", guid);
        const sequence = await project.getSequence(guid);
        if (!sequence) {
            throw new Error(`Sequence with ID ${sequenceId} not found`);
        }
        
        console.debug("[DEBUG] sequence:", sequence);
        // Set sequence as active
        const result = await project.setActiveSequence(sequence);
        console.debug("[DEBUG] result:", result);
        return {
            activated: result,
            sequenceId: sequenceId
        };
    });
}

/**
 * Get a list of all sequences in the project
 */
async function getSequenceList(): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const sequences = await project.getSequences();
        const sequenceList = sequences.map((seq: any) => ({
            name: seq.name,
            id: seq.guid.toString()
        }));
        
        // Always wrap the list in a dictionary instead of returning it directly
        return {
            sequences: sequenceList
        };
    });
}

/**
 * Get the current playhead position
 */
async function getPlayerPosition(): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const sequence = await project.getActiveSequence();
        if (!sequence) {
            throw new Error('No active sequence');
        }
        
        const position = await sequence.getPlayerPosition();
        return {
            seconds: position.seconds,
            ticks: position.ticks
        };
    });
}

/**
 * Set the playhead position
 */
async function setPlayerPosition(position: any): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const sequence = await project.getActiveSequence();
        if (!sequence) {
            throw new Error('No active sequence');
        }
        
        let tickTime;
        if (typeof position === 'number') {
            // If specified in seconds
            tickTime = app.TickTime.createWithSeconds(position);
        } else if (position.ticks) {
            // If specified in ticks
            tickTime = app.TickTime.createWithTicks(position.ticks);
        } else if (position.frame !== undefined && position.frameRate !== undefined) {
            // If specified in frames and frame rate
            const frameRate = app.FrameRate.createWithValue(position.frameRate);
            tickTime = app.TickTime.createWithFrameAndFrameRate(position.frame, frameRate);
        } else {
            throw new Error('Invalid position format');
        }
        
        const result = await sequence.setPlayerPosition(tickTime);
        return {
            positioned: result,
            seconds: tickTime.seconds
        };
    });
}

/**
 * === Media Import Related Functions ===
 */

/**
 * Import files into the project
 */
async function importFiles(filePaths: string[], suppressUI?: boolean, targetBin?: any, asNumberedStills?: boolean): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const result = await project.importFiles(filePaths, suppressUI, targetBin, asNumberedStills);
        return {
            imported: result,
            fileCount: filePaths.length,
            files: filePaths
        };
    });
}

/**
 * Import sequences from another project
 */
async function importSequences(projectPath: string, sequenceIds: string[]): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const result = await project.importSequences(projectPath, sequenceIds);
        return {
            imported: result,
            sequenceCount: sequenceIds.length,
            sourceProject: projectPath
        };
    });
}

/**
 * Import After Effects compositions
 */
async function importAEComps(aepPath: string, compNames: string[], targetBin?: any): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const result = await project.importAEComps(aepPath, compNames, targetBin);
        return {
            imported: result,
            compCount: compNames.length,
            aepPath: aepPath
        };
    });
}

/**
 * Import all After Effects compositions from a project
 */
async function importAllAEComps(aepPath: string, targetBin?: any): Promise<StandardResponse> {
    return safeExecute(async () => {
        const project = await app.Project.getActiveProject();
        if (!project) {
            throw new Error('No active project');
        }
        
        const result = await project.importAllAEComps(aepPath, targetBin);
        return {
            imported: result,
            aepPath: aepPath
        };
    });
}

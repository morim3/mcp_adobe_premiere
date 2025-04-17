// @ts-ignore: UXP built-in module for Adobe Premiere Pro
const app = require('premierepro');

// @ts-ignore: UXP built-in modules
// const { document } = require("uxp");

import { WebSocketClient } from './websocket_server';

console.log("[MCPAdobe] Starting initialization...");

let statusOutput: HTMLElement | null = null;
let connectButton: HTMLButtonElement | null = null;
let disconnectButton: HTMLButtonElement | null = null;
let urlInput: HTMLInputElement | null = null;

let webSocketClient: WebSocketClient;

function init(): void {
  console.log("[MCPAdobe] Initializing plugin...");
  
  // Get UI elements
  statusOutput = document.getElementById('status');
  connectButton = document.getElementById('connect') as HTMLButtonElement;
  disconnectButton = document.getElementById('disconnect') as HTMLButtonElement;
  urlInput = document.getElementById('serverUrl') as HTMLInputElement;
  
  if (!statusOutput || !connectButton || !disconnectButton || !urlInput) {
    console.error('[MCPAdobe] Required UI elements not found');
    return;
  }
  
  // Set default URL
  urlInput.value = 'ws://localhost:8765';
  
  // Initialize WebSocket client
  webSocketClient = new WebSocketClient((status, isConnected) => {
    updateStatus(status);
    updateButtons(isConnected);
  });
  
  // Set up event listeners
  connectButton.addEventListener('click', handleConnect);
  disconnectButton.addEventListener('click', handleDisconnect);
  
  // Initial UI state
  updateStatus('Disconnected');
  updateButtons(false);
  
  console.log('[MCPAdobe] Plugin initialized');
}

function updateStatus(status: string): void {
  console.log("[MCPAdobe] Status update:", status);
  if (statusOutput) {
    statusOutput.textContent = `Status: ${status}`;
  }
}

function updateButtons(isConnected: boolean): void {
  if (connectButton && disconnectButton && urlInput) {
    connectButton.disabled = isConnected;
    disconnectButton.disabled = !isConnected;
    urlInput.disabled = isConnected;
  }
}

async function handleConnect(): Promise<void> {
  try {
    if (!urlInput || !webSocketClient) return;
    
    const url = urlInput.value.trim();
    if (!url) {
      updateStatus('Error: URL cannot be empty');
      return;
    }
    
    webSocketClient.setUrl(url);
    await webSocketClient.connect();
  } catch (error) {
    console.error('[MCPAdobe] Connection error:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    updateButtons(false);
  }
}

function handleDisconnect(): void {
  if (webSocketClient) {
    webSocketClient.disconnect();
  }
}

// Initialize plugin
init();

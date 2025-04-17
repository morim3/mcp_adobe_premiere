/**
 * WebSocket client for MCPAdobe UXP plugin
 * Handles real-time communication between the UXP plugin and MCP server
 */

import { executeAction } from './tools';

export interface WebSocketMessage {
  id: string;
  action: string;
  data?: any;
}

export interface WebSocketResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string = 'ws://localhost:8765';
  private statusCallback: (status: string, isConnected: boolean) => void;

  constructor(statusCallback: (status: string, isConnected: boolean) => void) {
    this.statusCallback = statusCallback;
  }

  setUrl(url: string): void {
    this.url = url;
  }

  async connect(): Promise<void> {
    try {
      if (this.socket) {
        this.disconnect();
      }

      this.updateStatus('Connecting...', false);
      
      // @ts-ignore: UXP WebSocket API
      this.socket = new WebSocket(this.url);
      console.log(`WebSocket connecting to ${this.url}`);

      this.socket.onopen = () => {
        this.updateStatus('Connected', true);
        console.log('WebSocket connected');
      };

      this.socket.onmessage = (event) => {
        console.log('Message received:', event.data);
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.socket.onclose = () => {
        this.updateStatus('Disconnected', false);
        console.log('WebSocket disconnected');
        this.socket = null;
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateStatus('Connection error', false);
        this.socket = null;
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      this.updateStatus(`Connection failed: ${error instanceof Error ? error.message : String(error)}`, false);
      throw error;
    }
  }

  private updateStatus(status: string, isConnected: boolean): void {
    if (this.statusCallback) {
      this.statusCallback(status, isConnected);
    }
  }

  private async handleMessage(message: WebSocketMessage): Promise<void> {
    try {
      console.log(`Processing message: ${message.action}`, message);
      const result = await executeAction(message.action, message.data);
      this.sendResponse(message.id, { success: true, result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error processing message: ${errorMessage}`);
      this.sendResponse(message.id, { success: false, error: errorMessage });
    }
  }


  private sendResponse(messageId: string, response: Omit<WebSocketResponse, 'id'>): void {
    if (!this.socket || this.socket.readyState !== 1) { // 1 = OPEN
      console.error('Cannot send response: WebSocket not connected');
      return;
    }

    const fullResponse: WebSocketResponse = {
      id: messageId,
      ...response
    };
    
    try {
      this.socket.send(JSON.stringify(fullResponse));
    } catch (error) {
      console.error('Error sending response:', error);
    }
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === 1; // 1 = OPEN
  }

  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      this.socket = null;
      this.updateStatus('Disconnected', false);
    }
  }
}

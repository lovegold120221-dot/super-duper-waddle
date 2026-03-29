const MEETING_BUS_URL = 'ws://localhost:8002';

export interface MeetingMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  type: 'speech' | 'system' | 'speech_end' | 'request_speak';
  metadata: Record<string, unknown>;
}

export interface MeetingStatus {
  status: 'active' | 'not_found' | 'waiting';
  session_id: string;
  participants: string[];
  current_speaker: string | null;
  queue: string[];
  message_count: number;
}

type MessageHandler = (message: MeetingMessage) => void;
type StatusHandler = (status: MeetingStatus) => void;
type ErrorHandler = (error: Event) => void;

export class MeetingBusClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private agentId: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(agentId: string = 'frontend') {
    this.agentId = agentId;
  }

  async connect(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${MEETING_BUS_URL}/meetings/${sessionId}/join?agent=${this.agentId}`);

        this.ws.onopen = () => {
          console.log(`[MeetingBus] Connected to session ${sessionId} as ${this.agentId}`);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as MeetingMessage;
            
            if (message.type === 'system' && message.sender === 'system') {
              this.fetchStatus();
            }
            
            this.messageHandlers.forEach(handler => handler(message));
          } catch (e) {
            console.error('[MeetingBus] Failed to parse message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[MeetingBus] WebSocket error:', error);
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[MeetingBus] Connection closed');
          this.attemptReconnect();
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.sessionId) {
      console.log('[MeetingBus] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[MeetingBus] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId).catch(console.error);
      }
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.reconnectAttempts = this.maxReconnectAttempts;
  }

  async sendMessage(text: string, type: 'speech' | 'speech_end' | 'request_speak' = 'speech'): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message: Partial<MeetingMessage> = {
      id: crypto.randomUUID(),
      sender: this.agentId,
      text,
      timestamp: new Date().toISOString(),
      type,
      metadata: {}
    };

    this.ws.send(JSON.stringify(message));
  }

  async requestToSpeak(): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      id: crypto.randomUUID(),
      sender: this.agentId,
      text: '',
      timestamp: new Date().toISOString(),
      type: 'request_speak',
      metadata: {}
    };

    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.can_speak !== undefined) {
            this.ws?.removeEventListener('message', handler);
            resolve(data.can_speak);
          }
        } catch (e) {}
      };
      
      this.ws?.addEventListener('message', handler);
      this.ws?.send(JSON.stringify(message));
      
      setTimeout(() => {
        this.ws?.removeEventListener('message', handler);
        resolve(false);
      }, 2000);
    });
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  async fetchStatus(): Promise<MeetingStatus | null> {
    if (!this.sessionId) return null;
    
    try {
      const response = await fetch(`${MEETING_BUS_URL}/meetings/${this.sessionId}/status`);
      const status = await response.json() as MeetingStatus;
      this.statusHandlers.forEach(handler => handler(status));
      return status;
    } catch (e) {
      console.error('[MeetingBus] Failed to fetch status:', e);
      return null;
    }
  }

  async getMessages(limit: number = 50): Promise<MeetingMessage[]> {
    if (!this.sessionId) return [];
    
    try {
      const response = await fetch(`${MEETING_BUS_URL}/meetings/${this.sessionId}/messages?limit=${limit}`);
      const data = await response.json();
      return data.messages as MeetingMessage[];
    } catch (e) {
      console.error('[MeetingBus] Failed to fetch messages:', e);
      return [];
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  get currentSessionId(): string | null {
    return this.sessionId;
  }
}

let clientInstance: MeetingBusClient | null = null;

export function getMeetingBusClient(agentId?: string): MeetingBusClient {
  if (!clientInstance) {
    clientInstance = new MeetingBusClient(agentId);
  }
  return clientInstance;
}

export async function checkMeetingBusHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8002/health');
    return response.ok;
  } catch {
    return false;
  }
}

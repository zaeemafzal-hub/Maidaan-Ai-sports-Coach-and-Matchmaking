import { io, Socket } from 'socket.io-client';
import { AuthStorage } from './storage';
import { supabase } from '../lib/supabase';
import { ChatMessage } from './chatService';

const getSocketUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:5000';
};

class SocketService {
  private socket: Socket | null = null;
  private joinedRooms: Set<string> = new Set();
  private messageListeners: Set<(message: ChatMessage) => void> = new Set();
  private errorListeners: Set<(err: any) => void> = new Set();
  private isConnecting: boolean = false;

  private async getAuthToken(): Promise<string | null> {
    let token = await AuthStorage.getToken();
    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          token = data.session.access_token;
          await AuthStorage.setToken(token);
        }
      } catch {
        // ignore
      }
    }
    return token;
  }

  /**
   * Connect or return existing active socket connection.
   */
  async connect(): Promise<Socket | null> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      return this.socket;
    }

    try {
      this.isConnecting = true;
      const token = await this.getAuthToken();
      if (!token) {
        this.isConnecting = false;
        return null;
      }

      const url = getSocketUrl();

      // If socket exists but disconnected, update auth and reconnect
      if (this.socket) {
        this.socket.auth = { token };
        this.socket.connect();
        this.isConnecting = false;
        return this.socket;
      }

      this.socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        // Re-join active channels on connection or reconnection
        this.joinedRooms.forEach((roomId) => {
          this.socket?.emit('chat:join-room', { roomId });
        });
      });

      this.socket.on('chat:message', (message: ChatMessage) => {
        this.messageListeners.forEach((listener) => {
          try {
            listener(message);
          } catch (e) {
            console.warn('[SocketService] Error in message listener:', e);
          }
        });
      });

      this.socket.on('chat:error', (error: any) => {
        console.warn('[SocketService] Received chat error:', error);
        this.errorListeners.forEach((listener) => {
          try {
            listener(error);
          } catch (e) {
            console.warn('[SocketService] Error in error listener:', e);
          }
        });
      });

      this.socket.on('connect_error', (err: any) => {
        console.warn('[SocketService] Connection error:', err?.message || err);
      });

      this.isConnecting = false;
      return this.socket;
    } catch (err) {
      this.isConnecting = false;
      console.warn('[SocketService] Failed to initialize socket:', err);
      return null;
    }
  }

  /**
   * Disconnect the socket client.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.joinedRooms.clear();
  }

  /**
   * Join a room channel.
   */
  async joinRoom(roomId: string): Promise<void> {
    if (!roomId) return;
    this.joinedRooms.add(roomId);

    const s = await this.connect();
    if (s && s.connected) {
      s.emit('chat:join-room', { roomId });
    }
  }

  /**
   * Leave a room channel.
   */
  leaveRoom(roomId: string): void {
    if (!roomId) return;
    this.joinedRooms.delete(roomId);

    if (this.socket && this.socket.connected) {
      this.socket.emit('chat:leave-room', { roomId });
    }
  }

  /**
   * Register a listener for new incoming chat messages.
   * Returns an unsubscribe function.
   */
  onMessage(callback: (message: ChatMessage) => void): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  /**
   * Register a listener for chat-level errors (such as ROOM_ACCESS_DENIED).
   * Returns an unsubscribe function.
   */
  onError(callback: (error: any) => void): () => void {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
    };
  }

  /**
   * Access underlying socket instance.
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();

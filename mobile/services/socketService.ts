import { io, Socket } from "socket.io-client";
import { AuthStorage } from "./storage";
import { supabase } from "../lib/supabase";
import { ChatMessage } from "./chatService";

export interface ChatSendAck {
  success: boolean;
  message?: ChatMessage;
  clientMessageId?: string;
  code?: string;
  error?: string;
}

export interface TypingEventData {
  roomId: string;
  userId: string;
  userName?: string;
  isTyping: boolean;
}

export type RoomConnectionState = "joining" | "joined" | "failed" | "retrying";

import { getBaseUrl } from "./api";

const getSocketUrl = (): string => {
  return (
    process.env.EXPO_PUBLIC_SOCKET_URL?.trim().replace(/\/+$/, "") ||
    getBaseUrl()
  );
};

class SocketService {
  private socket: Socket | null = null;
  private joinedRooms: Set<string> = new Set();
  private messageListeners: Set<(message: ChatMessage) => void> = new Set();
  private errorListeners: Set<(err: any) => void> = new Set();
  private connectionStateListeners: Set<(connected: boolean) => void> =
    new Set();
  private typingListeners: Set<(data: TypingEventData) => void> = new Set();
  private isConnecting: boolean = false;
  private roomStateListeners = new Set<
    (roomId: string, state: RoomConnectionState) => void
  >();
  private notifyRoomState(roomId: string, state: RoomConnectionState): void {
    this.roomStateListeners.forEach((listener) => listener(roomId, state));
  }
  onRoomStateChange(
    listener: (roomId: string, state: RoomConnectionState) => void,
  ): () => void {
    this.roomStateListeners.add(listener);
    return () => {
      this.roomStateListeners.delete(listener);
    };
  }

  private async getFreshAuthToken(): Promise<string | null> {
    try {
      // 1. Try Supabase active session first
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        await AuthStorage.setToken(data.session.access_token);
        return data.session.access_token;
      }
    } catch {
      // ignore
    }

    // 2. Fall back to cached token (e.g. test sandbox token)
    return AuthStorage.getToken();
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
      const token = await this.getFreshAuthToken();
      if (!token) {
        this.isConnecting = false;
        return null;
      }

      const url = getSocketUrl();

      // If socket instance exists but disconnected, update auth credentials and reconnect
      if (this.socket) {
        this.socket.auth = { token };
        this.socket.connect();
        this.isConnecting = false;
        return this.socket;
      }

      this.socket = io(url, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
      });

      this.socket.on("connect", () => {
        this.notifyConnectionState(true);

        // Re-join active channels on initial connection or reconnect
        this.joinedRooms.forEach((roomId) => {
          void this.joinRoom(roomId);
        });
      });

      this.socket.on("disconnect", () => {
        this.notifyConnectionState(false);
        this.joinedRooms.forEach((room) =>
          this.notifyRoomState(room, "retrying"),
        );
      });

      this.socket.on("connect_error", () => {
        this.notifyConnectionState(false);
      });

      this.socket.on("chat:message", (message: ChatMessage) => {
        this.messageListeners.forEach((listener) => {
          try {
            listener(message);
          } catch (e) {
            console.warn("[SocketService] Error in message listener:", e);
          }
        });
      });

      this.socket.on("chat:typing", (data: TypingEventData) => {
        this.typingListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.warn("[SocketService] Error in typing listener:", e);
          }
        });
      });

      this.socket.on("chat:error", (error: any) => {
        console.warn("[SocketService] Received chat error:", error);
        this.errorListeners.forEach((listener) => {
          try {
            listener(error);
          } catch (e) {
            console.warn("[SocketService] Error in error listener:", e);
          }
        });
      });

      this.isConnecting = false;
      return this.socket;
    } catch (err) {
      this.isConnecting = false;
      console.warn("[SocketService] Failed to initialize socket:", err);
      this.notifyConnectionState(false);
      return null;
    }
  }

  private notifyConnectionState(connected: boolean) {
    this.connectionStateListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (e) {
        console.warn("[SocketService] Error in connection listener:", e);
      }
    });
  }

  /**
   * Disconnect the socket client immediately (e.g. on user logout).
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.joinedRooms.clear();
    this.notifyConnectionState(false);
  }

  /**
   * Reconnect after session token refresh or network restoration.
   */
  async reconnect(): Promise<void> {
    const rooms = [...this.joinedRooms];
    this.disconnect();
    rooms.forEach((room) => this.joinedRooms.add(room));
    await this.connect();
  }

  /**
   * Join a room channel with promise acknowledgement.
   */
  async joinRoom(roomId: string): Promise<boolean> {
    if (!roomId) return false;
    this.joinedRooms.add(roomId);
    this.notifyRoomState(roomId, "joining");

    const s = await this.connect();
    if (!s) {
      this.notifyRoomState(roomId, "failed");
      return false;
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.notifyRoomState(roomId, success ? "joined" : "failed");
        resolve(success);
      };
      const timer = setTimeout(() => finish(false), 10000);
      s.emit("room:join", { roomId }, (res: any) => {
        if (settled && res?.success && this.joinedRooms.has(roomId)) {
          this.notifyRoomState(roomId, "joined");
          return;
        }
        finish(Boolean(res?.success));
      });
    });
  }

  /**
   * Leave a room channel.
   */
  leaveRoom(roomId: string): void {
    if (!roomId) return;
    this.joinedRooms.delete(roomId);

    if (this.socket && this.socket.connected) {
      this.socket.emit("room:leave", { roomId });
    }
  }

  /**
   * Sends a chat message via Socket.IO with strict acknowledgement callback.
   */
  async sendMessage(
    roomId: string,
    body: string,
    clientMessageId: string,
  ): Promise<ChatSendAck> {
    const s = await this.connect();
    if (!s || !s.connected) {
      return {
        success: false,
        code: "NOT_CONNECTED",
        error: "Live socket connection is unavailable.",
      };
    }

    return new Promise((resolve) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            success: false,
            code: "TIMEOUT",
            error: "Message send acknowledgement timed out.",
          });
        }
      }, 5000);

      s.emit(
        "chat:send",
        { roomId, body, clientMessageId },
        (res: ChatSendAck) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(res);
          }
        },
      );
    });
  }

  /**
   * Send ephemeral typing indicator.
   */
  startTyping(roomId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("chat:typing:start", { roomId });
    }
  }

  stopTyping(roomId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("chat:typing:stop", { roomId });
    }
  }

  /**
   * Subscribe to new incoming chat messages.
   */
  onMessage(callback: (message: ChatMessage) => void): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  /**
   * Subscribe to typing indicators.
   */
  onTyping(callback: (data: TypingEventData) => void): () => void {
    this.typingListeners.add(callback);
    return () => {
      this.typingListeners.delete(callback);
    };
  }

  /**
   * Subscribe to connection status changes.
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionStateListeners.add(callback);
    // Notify immediately with current state
    callback(Boolean(this.socket && this.socket.connected));
    return () => {
      this.connectionStateListeners.delete(callback);
    };
  }

  /**
   * Subscribe to chat errors.
   */
  onError(callback: (error: any) => void): () => void {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
    };
  }

  isConnected(): boolean {
    return Boolean(this.socket && this.socket.connected);
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();

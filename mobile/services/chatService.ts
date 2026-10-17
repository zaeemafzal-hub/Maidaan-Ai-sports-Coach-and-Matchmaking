import { api } from './api';
import { Role } from '../types';

export type ChatRoomType = 'DIRECT' | 'GROUP';

export interface ChatMember {
  id: string;
  name: string;
  role?: Role;
}

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  matchId?: string | null;
  title: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  members: ChatMember[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole?: Role;
  body: string;
  createdAt: string;
  clientMessageId?: string;
}

export const chatService = {
  /**
   * GET /api/chat/rooms
   * Fetch all chat rooms for the authenticated user.
   */
  async getRooms(): Promise<ChatRoom[]> {
    const res = await api.get<{ rooms: ChatRoom[] }>('/api/chat/rooms');

    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to fetch chat rooms.');
    }

    if (Array.isArray(res.data.rooms)) {
      return res.data.rooms;
    }

    return [];
  },

  /**
   * POST /api/chat/direct
   * Open or create a direct chat room with participantId.
   */
  async openDirectChat(participantId: string): Promise<ChatRoom> {
    const res = await api.post<{ room: ChatRoom }>('/api/chat/direct', {
      participantId,
    });

    if (res.error || !res.data || !res.data.room) {
      const err = new Error(res.error || 'Failed to open direct chat.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data.room;
  },

  /**
   * POST /api/chat/matches/:matchId/room
   * Open or lazily create a match GROUP chat room.
   */
  async openMatchGroupRoom(matchId: string): Promise<ChatRoom> {
    const res = await api.post<{ room: ChatRoom }>(`/api/chat/matches/${matchId}/room`);

    if (res.error || !res.data || !res.data.room) {
      const err = new Error(res.error || 'Failed to open match squad room.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data.room;
  },

  /**
   * GET /api/chat/rooms/:roomId/messages
   * Retrieve messages for a room.
   */
  async getMessages(roomId: string): Promise<ChatMessage[]> {
    const res = await api.get<{ messages: ChatMessage[] }>(`/api/chat/rooms/${roomId}/messages`);

    if (res.error || !res.data) {
      const err = new Error(res.error || 'Failed to fetch room messages.');
      (err as any).status = res.status;
      throw err;
    }

    if (Array.isArray(res.data.messages)) {
      return res.data.messages;
    }

    return [];
  },

  /**
   * POST /api/chat/rooms/:roomId/messages
   * Send a text message to a room.
   */
  async sendMessage(roomId: string, body: string): Promise<ChatMessage> {
    const res = await api.post<{ message: ChatMessage }>(`/api/chat/rooms/${roomId}/messages`, {
      body,
    });

    if (res.error || !res.data || !res.data.message) {
      const err = new Error(res.error || 'Failed to send message.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data.message;
  },
};

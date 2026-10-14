import { Request, Response } from 'express';
import { SupabaseRepo } from '../models/supabaseRepo.js';
import { emitRoomMessage } from '../socket/socketServer.js';

export const ChatController = {
  /**
   * GET /api/chat/rooms
   * List all chat rooms where authenticated user is a member.
   */
  async getRooms(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const rooms = await SupabaseRepo.getUserChatRooms(userId);

      res.json({ rooms });
    } catch (err: any) {
      console.error('[ChatController.getRooms] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while fetching chat rooms.' });
    }
  },

  /**
   * POST /api/chat/direct
   * Open or create a direct 1-on-1 chat room between authenticated user and participantId.
   */
  async createDirectRoom(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const { participantId } = req.body;

      if (!participantId || typeof participantId !== 'string') {
        res.status(400).json({ error: 'Valid participantId string is required in request body.' });
        return;
      }

      if (participantId === userId) {
        res.status(400).json({ error: 'Cannot create a direct chat room with yourself.' });
        return;
      }

      // Verify target participant exists
      const targetUser = await SupabaseRepo.getProfile(participantId);
      if (!targetUser) {
        res.status(404).json({ error: 'Target chat participant profile not found.' });
        return;
      }

      const room = await SupabaseRepo.findOrCreateDirectRoom(userId, participantId);

      res.status(200).json({ room });
    } catch (err: any) {
      console.error('[ChatController.createDirectRoom] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while initializing direct chat room.' });
    }
  },

  /**
   * POST /api/chat/matches/:matchId/room
   * Lazily open or create the match GROUP chat room.
   * Only match captain and confirmed match participants may access.
   */
  async getOrCreateGroupRoom(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const matchId = req.params.matchId;

      if (!matchId) {
        res.status(400).json({ error: 'Match fixture ID is required in URL path.' });
        return;
      }

      // Check match fixture existence
      const match = await SupabaseRepo.getMatchById(matchId);
      if (!match) {
        res.status(404).json({ error: 'Match fixture not found.' });
        return;
      }

      // Check eligibility: captain OR confirmed participant
      const isCaptain = match.captainId === userId;
      const isConfirmedParticipant = await SupabaseRepo.isMatchParticipant(matchId, userId);

      if (!isCaptain && !isConfirmedParticipant) {
        res.status(403).json({
          error: 'Access denied: Only the match captain and confirmed participants can access this match group room.',
        });
        return;
      }

      const result = await SupabaseRepo.findOrCreateGroupRoom(matchId);

      res.status(result.created ? 201 : 200).json({ room: result.room });
    } catch (err: any) {
      console.error('[ChatController.getOrCreateGroupRoom] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while resolving match group room.' });
    }
  },

  /**
   * GET /api/chat/rooms/:roomId/messages
   * Retrieve messages for a chat room. Requires authenticated membership.
   */
  async getRoomMessages(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const roomId = req.params.roomId;

      if (!roomId) {
        res.status(400).json({ error: 'Room ID is required.' });
        return;
      }

      // Check room exists
      const room = await SupabaseRepo.getChatRoomById(roomId, userId);
      if (!room) {
        res.status(404).json({ error: 'Chat room not found.' });
        return;
      }

      // Check membership
      const isMember = await SupabaseRepo.isChatRoomMember(roomId, userId);
      if (!isMember) {
        res.status(403).json({ error: 'Access denied: You are not an authorized member of this chat room.' });
        return;
      }

      const messages = await SupabaseRepo.getRoomMessages(roomId, 100);

      res.json({ messages });
    } catch (err: any) {
      console.error('[ChatController.getRoomMessages] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while fetching room messages.' });
    }
  },

  /**
   * POST /api/chat/rooms/:roomId/messages
   * Post a new text message to a chat room. Requires authenticated membership.
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const roomId = req.params.roomId;

      if (!roomId) {
        res.status(400).json({ error: 'Room ID is required.' });
        return;
      }

      // Validate message content
      const rawBody = req.body?.body;
      if (rawBody === undefined || rawBody === null || typeof rawBody !== 'string') {
        res.status(400).json({ error: 'Message body string is required.' });
        return;
      }

      const trimmedBody = rawBody.trim();
      if (trimmedBody.length === 0) {
        res.status(400).json({ error: 'Message body cannot be empty or whitespace only.' });
        return;
      }

      if (rawBody.length > 500) {
        res.status(400).json({ error: 'Message exceeds maximum allowable length of 500 characters.' });
        return;
      }

      // Check room exists
      const room = await SupabaseRepo.getChatRoomById(roomId, userId);
      if (!room) {
        res.status(404).json({ error: 'Chat room not found.' });
        return;
      }

      // Check membership
      const isMember = await SupabaseRepo.isChatRoomMember(roomId, userId);
      if (!isMember) {
        res.status(403).json({ error: 'Access denied: You are not an authorized member of this chat room.' });
        return;
      }

      // If GROUP room, verify match participation is still valid
      if (room.type === 'GROUP' && room.matchId) {
        const match = await SupabaseRepo.getMatchById(room.matchId);
        if (match) {
          const isCaptain = match.captainId === userId;
          const isParticipant = await SupabaseRepo.isMatchParticipant(room.matchId, userId);
          if (!isCaptain && !isParticipant) {
            res.status(403).json({
              error: 'Access denied: You are no longer an active participant or captain of this match.',
            });
            return;
          }
        }
      }

      const message = await SupabaseRepo.createChatMessage({
        roomId,
        senderId: userId,
        body: trimmedBody,
      });

      // Realtime Broadcast: Emit persisted message to authorized room subscribers
      emitRoomMessage(roomId, message);

      res.status(201).json({ message });
    } catch (err: any) {
      console.error('[ChatController.sendMessage] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while sending message.' });
    }
  },
};

import { corsOrigin, isOriginAllowed } from '../config/cors.js';
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAuthToken } from '../middleware/auth.js';
import { SupabaseRepo, ChatMessageOutput } from '../models/supabaseRepo.js';

let io: Server | null = null;

export interface SocketAuthData {
  userId: string;
  role?: string;
}

// In-memory rate limiting: max 40 messages per 60 seconds per user
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const userRateLimits = new Map<string, RateLimitRecord>();
const MAX_MESSAGES_PER_MINUTE = 40;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  let record = userRateLimits.get(userId);
  if (!record || record.resetAt <= now) {
    record = { count: 1, resetAt: now + 60 * 1000 };
    userRateLimits.set(userId, record);
    return true;
  }
  if (record.count >= MAX_MESSAGES_PER_MINUTE) {
    return false;
  }
  record.count += 1;
  return true;
}

export function resetRateLimits(): void {
  userRateLimits.clear();
}

/**
 * Initializes the Socket.IO server attached to the existing Express HTTP server.
 */
export function initSocketServer(httpServer: HttpServer): Server {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    allowRequest: (request, callback) => callback(null, isOriginAllowed(request.headers.origin)),
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Socket authentication middleware using trusted Supabase token verification
  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization
          ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
          : null);

      if (!token || typeof token !== 'string' || !token.trim()) {
        return next(new Error('AUTH_REQUIRED'));
      }

      const authCtx = await verifyAuthToken(token.trim());
      if (!authCtx || !authCtx.userId) {
        return next(new Error('AUTH_REQUIRED'));
      }

      let userName = 'Athlete';
      try {
        const profile = await SupabaseRepo.getProfile(authCtx.userId);
        if (profile?.name) {
          userName = profile.name;
        }
      } catch {
        // Safe fallback
      }

      socket.data = {
        userId: authCtx.userId,
        userName,
        role: authCtx.role,
      };

      next();
    } catch {
      next(new Error('AUTH_REQUIRED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data?.userId;

    // -----------------------------------------------------------------------
    // ROOM JOIN (room:join and legacy alias chat:join-room)
    // -----------------------------------------------------------------------
    const handleJoin = async (data: { roomId?: string }, callback?: (res: any) => void) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const roomId = data?.roomId;

      if (!roomId || typeof roomId !== 'string') {
        const error = { code: 'INVALID_ROOM', message: 'Valid roomId is required.' };
        socket.emit('chat:error', error);
        return ack({ success: false, code: error.code, error: error.message });
      }

      if (!userId) {
        const error = { code: 'UNAUTHORIZED', message: 'Authentication required.' };
        socket.emit('chat:error', error);
        return ack({ success: false, code: error.code, error: error.message });
      }

      try {
        const room = await SupabaseRepo.getChatRoomById(roomId, userId);
        if (!room) {
          const error = { code: 'ROOM_NOT_FOUND', message: 'Chat room not found.' };
          socket.emit('chat:error', error);
          return ack({ success: false, code: error.code, error: error.message });
        }

        const isMember = await SupabaseRepo.isChatRoomMember(roomId, userId);
        if (!isMember) {
          const error = {
            code: 'NOT_ROOM_MEMBER',
            message: 'You are not an authorized member of this chat room.',
          };
          socket.emit('chat:error', error);
          return ack({ success: false, code: error.code, error: error.message });
        }

        // If group match room, verify user is captain or confirmed participant
        if (room.type === 'GROUP' && room.matchId) {
          const match = await SupabaseRepo.getMatchById(room.matchId);
          if (match) {
            const isCaptain = match.captainId === userId;
            const isParticipant = await SupabaseRepo.isMatchParticipant(room.matchId, userId);
            if (!isCaptain && !isParticipant) {
              const error = {
                code: 'NOT_ROOM_MEMBER',
                message: 'Access denied: Only confirmed participants and the captain may enter this squad room.',
              };
              socket.emit('chat:error', error);
              return ack({ success: false, code: error.code, error: error.message });
            }
          }
        }

        socket.join(roomId);
        socket.emit('room:joined', { roomId });
        ack({ success: true, roomId });
      } catch (err: any) {
        const error = { code: 'ROOM_ERROR', message: err?.message || 'Failed to verify room access.' };
        socket.emit('chat:error', error);
        ack({ success: false, code: error.code, error: error.message });
      }
    };

    socket.on('room:join', handleJoin);
    socket.on('chat:join-room', handleJoin);

    // -----------------------------------------------------------------------
    // ROOM LEAVE (room:leave and legacy alias chat:leave-room)
    // -----------------------------------------------------------------------
    const handleLeave = (data: { roomId?: string }, callback?: (res: any) => void) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const roomId = data?.roomId;
      if (roomId && typeof roomId === 'string') {
        socket.leave(roomId);
        ack({ success: true, roomId });
      } else {
        ack({ success: false, code: 'INVALID_ROOM', error: 'Valid roomId is required.' });
      }
    };

    socket.on('room:leave', handleLeave);
    socket.on('chat:leave-room', handleLeave);

    // -----------------------------------------------------------------------
    // SEND MESSAGE (chat:send) — Persist Before Broadcast + Authoritative Identity
    // -----------------------------------------------------------------------
    socket.on(
      'chat:send',
      async (
        data: { roomId?: string; clientMessageId?: string; body?: string },
        callback?: (res: any) => void
      ) => {
        const ack = typeof callback === 'function' ? callback : () => {};

        if (!userId) {
          const error = { code: 'UNAUTHORIZED', message: 'Authentication required.' };
          socket.emit('chat:error', error);
          return ack({ success: false, code: error.code, error: error.message });
        }

        const roomId = data?.roomId;
        if (!roomId || typeof roomId !== 'string') {
          const error = { code: 'ROOM_NOT_FOUND', message: 'Valid roomId is required.' };
          socket.emit('chat:error', error);
          return ack({ success: false, code: error.code, error: error.message });
        }

        const rawBody = data?.body;
        if (rawBody === undefined || rawBody === null || typeof rawBody !== 'string') {
          const error = { code: 'INVALID_BODY', message: 'Message body must be a string.' };
          socket.emit('chat:error', error);
          return ack({ success: false, code: error.code, error: error.message });
        }

        const trimmedBody = rawBody.trim();
        if (trimmedBody.length === 0) {
          const error = { code: 'INVALID_BODY', message: 'Message body cannot be empty.' };
          socket.emit('chat:error', error);
          return ack({ success: false, code: error.code, error: error.message });
        }

        if (rawBody.length > 500) {
          const error = {
            code: 'MESSAGE_TOO_LONG',
            message: 'Message exceeds maximum length of 500 characters.',
          };
          socket.emit('chat:error', error);
          return ack({ success: false, code: error.code, error: error.message });
        }

        // Rate limit check
        if (!checkRateLimit(userId)) {
          const error = { code: 'RATE_LIMITED', message: 'Too many messages sent. Please slow down.' };
          socket.emit('chat:error', error);
          return ack({ success: false, code: error.code, error: error.message });
        }

        try {
          const room = await SupabaseRepo.getChatRoomById(roomId, userId);
          if (!room) {
            const error = { code: 'ROOM_NOT_FOUND', message: 'Chat room not found.' };
            socket.emit('chat:error', error);
            return ack({ success: false, code: error.code, error: error.message });
          }

          const isMember = await SupabaseRepo.isChatRoomMember(roomId, userId);
          if (!isMember) {
            const error = {
              code: 'NOT_ROOM_MEMBER',
              message: 'You are not an authorized member of this chat room.',
            };
            socket.emit('chat:error', error);
            return ack({ success: false, code: error.code, error: error.message });
          }

          if (room.type === 'GROUP' && room.matchId) {
            const match = await SupabaseRepo.getMatchById(room.matchId);
            if (match) {
              const isCaptain = match.captainId === userId;
              const isParticipant = await SupabaseRepo.isMatchParticipant(room.matchId, userId);
              if (!isCaptain && !isParticipant) {
                const error = {
                  code: 'NOT_ROOM_MEMBER',
                  message: 'You are no longer an active participant or captain of this match.',
                };
                socket.emit('chat:error', error);
                return ack({ success: false, code: error.code, error: error.message });
              }
            }
          }

          // Authoritative Persistence BEFORE Broadcast
          const persistedMessage = await SupabaseRepo.createChatMessage({
            roomId,
            senderId: userId,
            body: trimmedBody,
            clientMessageId: data.clientMessageId,
          });

          // Acknowledge the sender
          ack({
            success: true,
            message: persistedMessage,
            clientMessageId: data.clientMessageId,
          });

          // Broadcast authoritative persisted record to all sockets in room
          io?.to(roomId).emit('chat:message', persistedMessage);
        } catch (err: any) {
          console.error('[Socket.IO chat:send] Persistence failed:', err);
          const error = {
            code: 'MESSAGE_PERSIST_FAILED',
            message: 'Message could not be saved to database.',
          };
          socket.emit('chat:error', error);
          ack({ success: false, code: error.code, error: error.message });
        }
      }
    );

    // -----------------------------------------------------------------------
    // TYPING INDICATORS (chat:typing:start, chat:typing:stop)
    // -----------------------------------------------------------------------
    socket.on('chat:typing:start', async (data: { roomId?: string }) => {
      const roomId = data?.roomId;
      if (roomId && typeof roomId === 'string' && userId) {
        const isMember = await SupabaseRepo.isChatRoomMember(roomId, userId).catch(() => false);
        if (isMember) {
          socket.to(roomId).emit('chat:typing', {
            roomId,
            userId,
            userName: socket.data?.userName || 'Athlete',
            isTyping: true,
          });
        }
      }
    });

    socket.on('chat:typing:stop', (data: { roomId?: string }) => {
      const roomId = data?.roomId;
      if (roomId && typeof roomId === 'string' && userId) {
        socket.to(roomId).emit('chat:typing', {
          roomId,
          userId,
          userName: socket.data?.userName || 'Athlete',
          isTyping: false,
        });
      }
    });
  });

  return io;
}

/**
 * Accessor for the running Socket.IO server singleton.
 */
export function getSocketServer(): Server | null {
  return io;
}

/**
 * Broadcasts an authoritative persisted message to all sockets subscribed to roomId.
 */
export function emitRoomMessage(roomId: string, message: ChatMessageOutput): void {
  if (io) {
    io.to(roomId).emit('chat:message', message);
  }
}

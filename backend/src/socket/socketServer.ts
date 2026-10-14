import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAuthToken } from '../middleware/auth.js';
import { SupabaseRepo, ChatMessageOutput } from '../models/supabaseRepo.js';

let io: Server | null = null;

export interface SocketAuthData {
  userId: string;
  role?: string;
}

/**
 * Initializes the Socket.IO server attached to the existing Express HTTP server.
 */
export function initSocketServer(httpServer: HttpServer): Server {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Socket authentication middleware using trusted Supabase token verification
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization
          ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
          : null);

      if (!token) {
        return next(new Error('AUTH_REQUIRED'));
      }

      const authCtx = await verifyAuthToken(token);
      if (!authCtx || !authCtx.userId) {
        return next(new Error('AUTH_REQUIRED'));
      }

      socket.data = {
        userId: authCtx.userId,
        role: authCtx.role,
      };

      next();
    } catch {
      next(new Error('AUTH_REQUIRED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data?.userId;

    // Client requests to join a chat room channel
    socket.on('chat:join-room', async (data: { roomId?: string }, callback?: (res: any) => void) => {
      const roomId = data?.roomId;
      if (!roomId || typeof roomId !== 'string') {
        const error = { code: 'INVALID_ROOM', message: 'Valid roomId is required.' };
        socket.emit('chat:error', error);
        if (typeof callback === 'function') callback({ error: error.code });
        return;
      }

      try {
        const isMember = await SupabaseRepo.isChatRoomMember(roomId, userId);
        if (!isMember) {
          const error = {
            code: 'ROOM_ACCESS_DENIED',
            message: 'You are not an authorized member of this chat room.',
          };
          socket.emit('chat:error', error);
          if (typeof callback === 'function') callback({ error: error.code });
          return;
        }

        socket.join(roomId);
        if (typeof callback === 'function') {
          callback({ success: true, roomId });
        }
      } catch {
        const error = { code: 'ROOM_ERROR', message: 'Failed to verify room access.' };
        socket.emit('chat:error', error);
        if (typeof callback === 'function') callback({ error: error.code });
      }
    });

    // Client requests to leave a chat room channel
    socket.on('chat:leave-room', (data: { roomId?: string }, callback?: (res: any) => void) => {
      const roomId = data?.roomId;
      if (roomId && typeof roomId === 'string') {
        socket.leave(roomId);
        if (typeof callback === 'function') callback({ success: true, roomId });
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

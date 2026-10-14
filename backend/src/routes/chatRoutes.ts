import { Router } from 'express';
import { authenticateSupabaseUser } from '../middleware/auth.js';
import { ChatController } from '../controllers/chatController.js';

const router = Router();

// All chat routes require authentication
router.use(authenticateSupabaseUser);

// GET /api/chat/rooms — List authenticated user's chat rooms
router.get('/rooms', ChatController.getRooms);

// POST /api/chat/direct — Open/create direct 1-on-1 chat
router.post('/direct', ChatController.createDirectRoom);

// POST /api/chat/matches/:matchId/room — Open/create match group chat
router.post('/matches/:matchId/room', ChatController.getOrCreateGroupRoom);

// GET /api/chat/rooms/:roomId/messages — Get messages for a room
router.get('/rooms/:roomId/messages', ChatController.getRoomMessages);

// POST /api/chat/rooms/:roomId/messages — Send message to a room
router.post('/rooms/:roomId/messages', ChatController.sendMessage);

export default router;

import { Router } from 'express';
import { CoachController } from '../controllers/coachController.js';
import { authenticateSupabaseUser } from '../middleware/auth.js';

const router = Router();

// POST /api/coach/chat - Authenticated AI sports coaching chat
router.post('/chat', authenticateSupabaseUser, CoachController.chat);

export default router;

import { Router } from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authenticateSupabaseUser } from '../middleware/auth.js';

const router = Router();

// Submit Community Report (Authenticated users: PLAYER, TEAM_CAPTAIN, HUB_OWNER)
router.post('/', authenticateSupabaseUser, ReportController.createReport);

export default router;

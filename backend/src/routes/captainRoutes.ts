import { Router } from 'express';
import { MatchController } from '../controllers/matchController.js';
import { authenticateSupabaseUser, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Retrieve matches owned by the authenticated captain (IDOR protected)
router.get('/matches', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), MatchController.getCaptainMatches);

export default router;

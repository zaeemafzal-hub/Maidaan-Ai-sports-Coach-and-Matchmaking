import { Router } from 'express';
import { ProfileController } from '../controllers/profileController.js';
import { authenticateSupabaseUser, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Initialize or sync public.profiles row upon signup
router.post('/init', authenticateSupabaseUser, ProfileController.initProfile);

// Current user profile retrieval for session restoration
router.get('/me', authenticateSupabaseUser, ProfileController.getMyProfile);

// Role-protected profile setup/updates (IDOR-protected: strictly req.auth.userId)
router.put('/player', authenticateSupabaseUser, authorizeRoles('PLAYER'), ProfileController.updatePlayerProfile);
router.put('/captain', authenticateSupabaseUser, authorizeRoles('PLAYER', 'TEAM_CAPTAIN'), ProfileController.updateCaptainProfile);
router.put('/hub', authenticateSupabaseUser, authorizeRoles('PLAYER', 'HUB_OWNER'), ProfileController.updateHubOwnerProfile);

export default router;

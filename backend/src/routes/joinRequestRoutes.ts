import { Router } from 'express';
import { JoinRequestController } from '../controllers/joinRequestController.js';
import { authenticateSupabaseUser, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Player retrieves their own join requests (only PLAYER)
router.get('/me', authenticateSupabaseUser, authorizeRoles('PLAYER'), JoinRequestController.getMyRequests);

// Captain decides on a join request: ACCEPT or REJECT (only TEAM_CAPTAIN)
router.patch('/:id', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), JoinRequestController.updateRequestStatus);

export default router;

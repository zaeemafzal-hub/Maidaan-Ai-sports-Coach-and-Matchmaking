import { Router } from 'express';
import { MatchController } from '../controllers/matchController.js';
import { JoinRequestController } from '../controllers/joinRequestController.js';
import { authenticateSupabaseUser, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Create match fixture (only TEAM_CAPTAIN)
router.post('/', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), MatchController.createMatch);

// Discover match listings
router.get('/', authenticateSupabaseUser, MatchController.getMatches);

// Match details by id (404 if not found)
router.get('/:id', authenticateSupabaseUser, MatchController.getMatchById);

// Player requests to join a match slot (only PLAYER)
router.post('/:id/join', authenticateSupabaseUser, authorizeRoles('PLAYER'), JoinRequestController.createJoinRequest);

// Captain retrieves requests for their match (only TEAM_CAPTAIN)
router.get('/:id/requests', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), JoinRequestController.getMatchRequests);

export default router;

import { Router } from 'express';
import { MatchController } from '../controllers/matchController.js';
import { TeamController } from '../controllers/teamController.js';
import { authenticateSupabaseUser, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Matches owned by the authenticated captain (IDOR protected)
router.get('/matches', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), MatchController.getCaptainMatches);

// Open-slot recruitment control
router.patch('/matches/:id/recruitment', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), MatchController.updateRecruitment);

// Team management
router.get('/team', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), TeamController.getMyTeam);
router.post('/team', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), TeamController.createTeam);
router.patch('/team', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), TeamController.updateTeam);

// Team roster management
router.get('/team/members', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), TeamController.getTeamMembers);
router.post('/team/members', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), TeamController.addTeamMember);
router.delete('/team/members/:userId', authenticateSupabaseUser, authorizeRoles('TEAM_CAPTAIN'), TeamController.removeTeamMember);

export default router;

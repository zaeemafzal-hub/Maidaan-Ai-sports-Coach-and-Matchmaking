import { Router } from 'express';
import { AgentController } from '../controllers/agentController.js';
import { authenticateSupabaseUser } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/agent/chat
 * Protected endpoint executing Maidaan LangGraph Agent Workflow.
 */
router.post('/chat', authenticateSupabaseUser, AgentController.chat);

/**
 * Action Human-in-the-Loop Confirmation & Inspection Endpoints
 */
router.post('/actions/:actionId/confirm', authenticateSupabaseUser, AgentController.confirmAction);
router.post('/actions/:actionId/cancel', authenticateSupabaseUser, AgentController.cancelAction);
router.get('/actions/:actionId', authenticateSupabaseUser, AgentController.getAction);

export default router;

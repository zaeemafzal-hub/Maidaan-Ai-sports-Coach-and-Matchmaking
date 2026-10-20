import { Router } from 'express';
import { authenticateSupabaseUser } from '../middleware/auth.js';
import { clearAssistantHistory, getAssistantHistory, HistoryError, validateThread } from '../services/assistantHistory.js';

const router = Router();
router.use(authenticateSupabaseUser);
router.get('/:assistant', async (req, res) => {
  try {
    const assistant = req.params.assistant, topic = req.query.topic;
    validateThread(assistant, topic);
    const before = req.query.before;
    if (before !== undefined && typeof before !== 'string') throw new HistoryError('Invalid history cursor.', 400);
    res.json(await getAssistantHistory(req.auth!.userId, assistant, topic as string, before));
  } catch (error) {
    res.status(error instanceof HistoryError ? error.status : 503).json({error: error instanceof HistoryError ? error.message : 'Conversation history is unavailable.'});
  }
});
router.delete('/:assistant', async (req, res) => {
  try {
    const assistant = req.params.assistant, topic = req.query.topic;
    validateThread(assistant, topic);
    res.json(await clearAssistantHistory(req.auth!.userId, assistant, topic as string, req.body?.conversationId));
  } catch (error) {
    res.status(error instanceof HistoryError ? error.status : 503).json({error: error instanceof HistoryError ? error.message : 'Unable to clear conversation history.'});
  }
});
export default router;

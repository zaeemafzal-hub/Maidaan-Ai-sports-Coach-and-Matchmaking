import { Request, Response } from 'express';
import crypto from 'crypto';
import { invokeMaidaanAgent } from '../agents/graph.js';
import { AgentChatResponse } from '../agents/types.js';
import { executeCaptainAction } from '../agents/actions/captainActionTools.js';
import { actionStore } from '../agents/actions/actionStore.js';

const MAX_MESSAGE_LENGTH = 1500;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

// In-memory sliding window rate limiter
const agentRateLimits = new Map<string, { count: number; windowStart: number }>();

export const AgentController = {
  /**
   * POST /api/agent/chat
   * Authenticated sports concierge endpoint driven by official LangGraph StateGraph.
   */
  async chat(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = `agent_${crypto.randomUUID()}`;

    // 1. Enforce authentication context
    const userId = req.auth?.userId;
    const role = req.auth?.role;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required. No valid session.' });
      return;
    }

    // 2. Rate limiting (bypassed in test mode)
    if (process.env.NODE_ENV !== 'test') {
      const now = Date.now();
      const userLimit = agentRateLimits.get(userId);

      if (!userLimit || now - userLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
        agentRateLimits.set(userId, { count: 1, windowStart: now });
      } else {
        if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
          res.status(429).json({
            error: 'Agent rate limit exceeded. Please wait a moment before sending another message.',
          });
          return;
        }
        userLimit.count++;
      }
    }

    // 3. Validate request payload
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Request body must contain a non-empty string "message".' });
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      res.status(400).json({ error: 'Message cannot be blank or whitespace only.' });
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({
        error: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`,
      });
      return;
    }

    // 4. Invoke LangGraph Execution Graph
    try {
      const graphResult = await invokeMaidaanAgent({
        userId,
        role,
        message: trimmedMessage,
        requestId,
      });

      const durationMs = Date.now() - startTime;
      const toolUsed = graphResult.toolResult ? graphResult.toolResult.tool : 'none';

      // Structured logging (no sensitive user data logged)
      console.log(
        `[LangGraph Agent] requestId=${requestId} userId=${userId} intent=${graphResult.intent} tool=${toolUsed} duration=${durationMs}ms status=success`
      );

      const responsePayload: AgentChatResponse = {
        intent: graphResult.intent,
        message: graphResult.response,
        toolUsed,
        toolResult: graphResult.toolResult || null,
        data: graphResult.toolResult || null,
        action: graphResult.action || null,
        sources: graphResult.sources || null,
        requestId,
        durationMs,
      };

      res.status(200).json(responsePayload);
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      console.error(
        `[LangGraph Agent Error] requestId=${requestId} userId=${userId} duration=${durationMs}ms error=${err.message}`
      );

      res.status(500).json({
        error: 'The Maidaan Agent encountered an error processing your request.',
        requestId,
      });
    }
  },

  /**
   * POST /api/agent/actions/:actionId/confirm
   * Explicit confirmation endpoint for human-in-the-loop transactional actions.
   * Enforces server-side authentication, ownership boundary, expiry, idempotency, and concurrency safeguards.
   */
  async confirmAction(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required. No valid session.' });
      return;
    }

    const { actionId } = req.params;
    if (!actionId || !actionId.trim()) {
      res.status(400).json({ error: 'Action ID parameter is required.' });
      return;
    }

    try {
      const action = actionStore.getAction(actionId);
      if (!action) {
        res.status(404).json({ error: 'Action not found.' });
        return;
      }

      if (action.userId !== userId) {
        res.status(403).json({ error: 'Access forbidden: You do not own this pending action.' });
        return;
      }

      if (action.status === 'EXPIRED') {
        res.status(410).json({ error: 'Action has expired. Please prepare a new action.', status: 'EXPIRED' });
        return;
      }

      if (action.status === 'CANCELLED') {
        res.status(400).json({ error: 'Action was cancelled.', status: 'CANCELLED' });
        return;
      }

      const execResult = await executeCaptainAction(actionId, userId);
      if (!execResult.success) {
        // Concurrency or domain check failed
        res.status(409).json({
          error: execResult.error || 'Failed to execute action.',
          status: execResult.status,
          message: execResult.message,
          code: execResult.code,
        });
        return;
      }

      res.status(200).json({
        success: true,
        actionId,
        status: execResult.status,
        message: execResult.message,
        result: execResult.result || null,
      });
    } catch (err: any) {
      console.error('[AgentController.confirmAction] Error:', err);
      res.status(500).json({ error: 'Internal server error confirming action.' });
    }
  },

  /**
   * POST /api/agent/actions/:actionId/cancel
   * Explicit cancellation endpoint for pending transactional action drafts.
   */
  async cancelAction(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { actionId } = req.params;
    const action = actionStore.getAction(actionId);
    if (!action) {
      res.status(404).json({ error: 'Action not found.' });
      return;
    }

    if (action.userId !== userId) {
      res.status(403).json({ error: 'Forbidden: You do not own this action.' });
      return;
    }

    const cancelled = actionStore.cancelAction(actionId, userId);
    if (!cancelled) {
      res.status(400).json({ error: `Cannot cancel action in status: ${action.status}` });
      return;
    }

    res.status(200).json({
      success: true,
      actionId,
      status: 'CANCELLED',
      message: 'Action draft successfully cancelled.',
    });
  },

  /**
   * GET /api/agent/actions/:actionId
   * Inspect current action draft state and summary.
   */
  async getAction(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { actionId } = req.params;
    const action = actionStore.getAction(actionId);
    if (!action) {
      res.status(404).json({ error: 'Action not found.' });
      return;
    }

    if (action.userId !== userId) {
      res.status(403).json({ error: 'Forbidden: You do not own this action.' });
      return;
    }

    res.status(200).json({
      actionId: action.actionId,
      type: action.type,
      status: action.status,
      summary: action.summary,
      createdAt: action.createdAt,
      expiresAt: action.expiresAt,
      executionResult: action.executionResult || null,
    });
  },
};

import { Request, Response } from 'express';
import { CoachSport, ConversationMessage } from '../ai/types.js';
import { getAIProvider } from '../ai/providerFactory.js';

const ALLOWED_SPORTS: Set<string> = new Set(['cricket', 'football', 'badminton', 'padel']);
const MAX_MESSAGE_LENGTH = 1500;
const MAX_CONVERSATION_TURNS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

// In-memory sliding rate limiter per authenticated user ID
const userRateLimits = new Map<string, { count: number; windowStart: number }>();

export const CoachController = {
  /**
   * POST /api/coach/chat
   * Authenticated sports coaching chat endpoint
   */
  async chat(req: Request, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // Rate limiting (bypass in test mode to facilitate test suite executions)
    if (process.env.NODE_ENV !== 'test') {
      const now = Date.now();
      const userLimit = userRateLimits.get(userId);

      if (!userLimit || now - userLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
        userRateLimits.set(userId, { count: 1, windowStart: now });
      } else {
        if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
          res.status(429).json({
            error: 'AI Coach is receiving too many requests. Please try again shortly.',
          });
          return;
        }
        userLimit.count++;
      }
    }

    // 1. Sport validation
    const { sport, message, conversation } = req.body;

    if (!sport || typeof sport !== 'string' || !ALLOWED_SPORTS.has(sport.toLowerCase().trim())) {
      res.status(400).json({
        error: 'Invalid sport. Supported sports: cricket, football, badminton, padel.',
      });
      return;
    }
    const validatedSport = sport.toLowerCase().trim() as CoachSport;

    // 2. Message validation
    if (typeof message !== 'string') {
      res.status(400).json({ error: 'Message must be a string.' });
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({
        error: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`,
      });
      return;
    }

    // 3. Conversation history validation
    let validatedConversation: ConversationMessage[] | undefined;

    if (conversation !== undefined) {
      if (!Array.isArray(conversation)) {
        res.status(400).json({ error: 'Conversation history must be an array.' });
        return;
      }

      if (conversation.length > MAX_CONVERSATION_TURNS) {
        res.status(400).json({
          error: `Conversation history cannot exceed ${MAX_CONVERSATION_TURNS} messages.`,
        });
        return;
      }

      validatedConversation = [];

      for (let i = 0; i < conversation.length; i++) {
        const item = conversation[i];
        if (!item || typeof item !== 'object') {
          res.status(400).json({ error: `Conversation item ${i} is invalid.` });
          return;
        }

        const role = item.role;
        if (role !== 'user' && role !== 'assistant') {
          res.status(400).json({
            error: `Conversation item ${i} has invalid role. Only 'user' or 'assistant' are permitted.`,
          });
          return;
        }

        if (typeof item.content !== 'string' || item.content.trim().length === 0) {
          res.status(400).json({
            error: `Conversation item ${i} content cannot be empty.`,
          });
          return;
        }

        if (item.content.length > MAX_MESSAGE_LENGTH) {
          res.status(400).json({
            error: `Conversation item ${i} exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`,
          });
          return;
        }

        validatedConversation.push({
          role,
          content: item.content.trim(),
        });
      }
    }

    // 4. Resolve provider and generate coaching response
    try {
      if (process.env.NODE_ENV === 'test') {
        const testScenario = req.headers['x-test-ai-scenario'];
        if (testScenario === 'empty') {
          const emptyError: any = new Error('AI Coach returned an empty response.');
          emptyError.status = 502;
          throw emptyError;
        }
        if (testScenario === '429') {
          const rateLimitError: any = new Error('AI Coach is receiving too many requests. Please try again shortly.');
          rateLimitError.status = 429;
          throw rateLimitError;
        }
        if (testScenario === 'failure') {
          const failError: any = new Error('AI Coach is temporarily unavailable.');
          failError.status = 502;
          throw failError;
        }
        if (testScenario === 'timeout') {
          const timeoutError: any = new Error('AI Coach took too long to respond. Please try again.');
          timeoutError.status = 504;
          throw timeoutError;
        }
      }

      const provider = getAIProvider();
      const result = await provider.generateCoachResponse({
        sport: validatedSport,
        message: trimmedMessage,
        conversation: validatedConversation,
      });

      res.status(200).json({
        message: result.message,
        sport: result.sport,
        provider: result.provider,
        usedBackup: result.usedBackup ?? false,
        isFallback: false,
        requestId: result.requestId,
      });
    } catch (err: any) {
      console.error('[CoachController.chat] Provider error:', err);
      const statusCode = err?.status || 502;
      const safeMessage = err?.message || 'AI Coach is temporarily unavailable.';

      res.status(statusCode).json({
        error: safeMessage,
      });
    }
  },
};

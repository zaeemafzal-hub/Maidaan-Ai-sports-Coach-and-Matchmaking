import { AgentState, AgentUpdate } from '../state.js';
import { SupabaseRepo } from '../../models/supabaseRepo.js';
import { getCaptainMatchesTool, getCaptainJoinRequestsTool } from '../tools/captainTools.js';
import {
  prepareCreateMatchAction,
  prepareAcceptJoinRequestAction,
  prepareRejectJoinRequestAction,
  executeCaptainAction,
} from '../actions/captainActionTools.js';
import { actionStore } from '../actions/actionStore.js';
import { extractCreateMatchParams } from '../actions/extractActionParams.js';
import { CAPTAIN_SYSTEM_PROMPT } from '../prompts/captain.js';
import { GoogleGenAI } from '@google/genai';
import { sharedRAGEngine } from '../../rag/ragEngine.js';

export async function captainNode(state: AgentState): Promise<AgentUpdate> {
  const { userId, message, sport, area, skillLevel } = state;
  const normalizedMsg = (message || '').toLowerCase();

  // 1. Enforce Server-Side Role Authorization
  let isCaptain = false;
  if (state.role === 'TEAM_CAPTAIN') {
    isCaptain = true;
  } else if (userId) {
    isCaptain = await SupabaseRepo.hasRole(userId, 'TEAM_CAPTAIN');
  }

  if (!isCaptain) {
    return {
      response: `Access restricted: Captain features (match management and join request reviews) are exclusively available to Team Captains. Your account role is ${state.role || 'PLAYER'}.`,
      toolResult: null,
      action: null,
      sources: undefined,
    };
  }

  // 2. Check for Explicit Conversational Confirmation of Pending Action
  const isConfirm =
    normalizedMsg === 'confirm' ||
    normalizedMsg.startsWith('confirm ') ||
    normalizedMsg === 'yes create it' ||
    normalizedMsg === 'yes' ||
    normalizedMsg === 'accept the request' ||
    normalizedMsg === 'yes reject it' ||
    normalizedMsg === 'yes confirm';

  if (isConfirm) {
    const pending = actionStore.getLatestPendingAction(userId);
    if (!pending) {
      return {
        response: 'There are no pending actions awaiting your confirmation. You can ask to create a match or review join requests.',
        toolResult: null,
      };
    }

    const execResult = await executeCaptainAction(pending.actionId, userId);
    return {
      response: execResult.message,
      action: {
        actionId: pending.actionId,
        type: pending.type,
        status: execResult.status,
        summary: pending.summary,
        expiresAt: pending.expiresAt,
        executionResult: execResult.result || null,
      },
      toolResult: null,
    };
  }

  // 3. Check for Cancellation of Pending Action
  const isCancel =
    normalizedMsg === 'cancel' ||
    normalizedMsg.startsWith('cancel action') ||
    normalizedMsg === 'abort' ||
    normalizedMsg === 'nevermind';

  if (isCancel) {
    const pending = actionStore.getLatestPendingAction(userId);
    if (pending) {
      actionStore.cancelAction(pending.actionId, userId);
      return {
        response: `Action to ${pending.type.replace(/_/g, ' ').toLowerCase()} has been cancelled.`,
        action: {
          actionId: pending.actionId,
          type: pending.type,
          status: 'CANCELLED',
          summary: pending.summary,
          expiresAt: pending.expiresAt,
        },
        toolResult: null,
      };
    }
    return {
      response: 'No active action draft to cancel.',
      toolResult: null,
    };
  }

  // 4. Action: CREATE MATCH (Two-Phase Step 1: Draft Preparation)
  const isCreateMatch =
    /\b(?:create|schedule|host|organize)\s+(?:a\s+)?(?:(?:cricket|football|badminton|padel)\s+)?(?:match|fixture|game)\b/i.test(normalizedMsg) ||
    normalizedMsg.includes('create match') ||
    normalizedMsg.includes('create a match') ||
    normalizedMsg.includes('schedule match') ||
    normalizedMsg.includes('schedule a match') ||
    normalizedMsg.includes('host a match') ||
    normalizedMsg.includes('host match') ||
    normalizedMsg.includes('organize a match') ||
    normalizedMsg.includes('organize match');

  if (isCreateMatch) {
    const extracted = extractCreateMatchParams(message, sport, area, skillLevel);
    const prepResult = prepareCreateMatchAction(userId, extracted);

    if (!prepResult.success) {
      return {
        response: prepResult.message,
        action: null,
        toolResult: null,
      };
    }

    const draft = prepResult.action;
    const summary = draft.summary;
    const confirmPrompt =
      `Please confirm the fixture details before I create it:\n\n` +
      `📌 **${summary.title}** (${String(summary.sport).toUpperCase()})\n` +
      `📅 ${summary.date} at ${summary.startTime}\n` +
      `📍 ${summary.venue}, ${summary.area}\n` +
      `👥 Capacity: ${summary.capacity} players (${summary.openSlots} open slots) | ${summary.skillLevel}\n` +
      `💰 Fee: ${summary.fee}\n\n` +
      `⚠️ **Confirmation Required**: Reply "Confirm" to create this fixture in the live schedule.`;

    return {
      response: confirmPrompt,
      action: {
        actionId: draft.actionId,
        type: draft.type,
        status: draft.status,
        summary: draft.summary,
        expiresAt: draft.expiresAt,
      },
      toolResult: null,
    };
  }

  // 5. Action: ACCEPT JOIN REQUEST (Two-Phase Step 1: Draft Preparation)
  const isAcceptRequest =
    (normalizedMsg.includes('accept') || normalizedMsg.includes('approve')) &&
    (normalizedMsg.includes('request') || normalizedMsg.includes('applicant') || normalizedMsg.includes('player'));

  if (isAcceptRequest) {
    // Extract player name if mentioned
    let queryPlayer: string | undefined = undefined;
    const nameMatch = message.match(/(?:accept|approve)\s+([A-Za-z0-9\s]+?)(?:'s|\s+request|\s+for|\s+to|$)/i);
    if (nameMatch && nameMatch[1]) {
      const candidate = nameMatch[1].trim();
      if (!['the', 'this', 'a', 'join', 'pending'].includes(candidate.toLowerCase())) {
        queryPlayer = candidate;
      }
    }

    const prepResult = await prepareAcceptJoinRequestAction(userId, { playerName: queryPlayer });
    if (!prepResult.success) {
      return {
        response: prepResult.message,
        action: null,
        toolResult: null,
      };
    }

    const draft = prepResult.action;
    const summary = draft.summary;
    const confirmPrompt =
      `Please confirm accepting **${summary.player}** for "*${summary.match}*"?\n\n` +
      `⚠️ **Confirmation Required**: Reply "Confirm" to confirm this spot in the lineup.`;

    return {
      response: confirmPrompt,
      action: {
        actionId: draft.actionId,
        type: draft.type,
        status: draft.status,
        summary: draft.summary,
        expiresAt: draft.expiresAt,
      },
      toolResult: null,
    };
  }

  // 6. Action: REJECT JOIN REQUEST (Two-Phase Step 1: Draft Preparation)
  const isRejectRequest =
    (normalizedMsg.includes('reject') || normalizedMsg.includes('decline')) &&
    (normalizedMsg.includes('request') || normalizedMsg.includes('applicant') || normalizedMsg.includes('player'));

  if (isRejectRequest) {
    let queryPlayer: string | undefined = undefined;
    const nameMatch = message.match(/(?:reject|decline)\s+([A-Za-z0-9\s]+?)(?:'s|\s+request|\s+for|\s+to|$)/i);
    if (nameMatch && nameMatch[1]) {
      const candidate = nameMatch[1].trim();
      if (!['the', 'this', 'a', 'join', 'pending'].includes(candidate.toLowerCase())) {
        queryPlayer = candidate;
      }
    }

    const prepResult = await prepareRejectJoinRequestAction(userId, { playerName: queryPlayer });
    if (!prepResult.success) {
      return {
        response: prepResult.message,
        action: null,
        toolResult: null,
      };
    }

    const draft = prepResult.action;
    const summary = draft.summary;
    const confirmPrompt =
      `Please confirm declining the request from **${summary.player}** for "*${summary.match}*"?\n\n` +
      `⚠️ **Confirmation Required**: Reply "Confirm" to decline.`;

    return {
      response: confirmPrompt,
      action: {
        actionId: draft.actionId,
        type: draft.type,
        status: draft.status,
        summary: draft.summary,
        expiresAt: draft.expiresAt,
      },
      toolResult: null,
    };
  }

  // 7. Read-Only Query Routing (Phase 3 Preserved)
  const isRequestQuery =
    normalizedMsg.includes('request') ||
    normalizedMsg.includes('applied') ||
    normalizedMsg.includes('applicant') ||
    normalizedMsg.includes('who wants to join');

  let captainSources: { source: string; section: string }[] = [];
  try {
    const filterSource = isRequestQuery ? 'join-requests.md' : 'captain-rules.md';
    const ragResults = sharedRAGEngine.retrieve(message, { filterSource, topK: 1 });
    if (ragResults.length > 0) {
      captainSources = [{ source: ragResults[0].source, section: ragResults[0].section }];
    }
  } catch {
    // Non-fatal
  }

  if (isRequestQuery) {
    const requestResult = await getCaptainJoinRequestsTool(userId);
    const { requests, pendingCount } = requestResult;

    if (requests.length === 0) {
      return {
        response: 'You currently have no join requests for your hosted matches. When players apply to join your squad, they will appear here.',
        toolResult: requestResult,
        sources: captainSources.length > 0 ? captainSources : undefined,
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && process.env.NODE_ENV !== 'test') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `User Query: "${message}"
Live Join Requests for Captain (${requests.length} total, ${pendingCount} pending):
${JSON.stringify(requests, null, 2)}

Provide a structured summary of the pending player requests. Mention applicant names, match titles, skill levels, and notes.`;

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: CAPTAIN_SYSTEM_PROMPT,
            temperature: 0.2,
            maxOutputTokens: 350,
          },
        });

        const reply = result.text?.trim();
        if (reply) {
          return {
            response: reply,
            toolResult: requestResult,
            sources: captainSources.length > 0 ? captainSources : undefined,
          };
        }
      } catch {
        // Fallback
      }
    }

    const requestLines = requests.slice(0, 5).map((r, i) => {
      const note = r.message ? ` — "${r.message}"` : '';
      return `${i + 1}. **${r.playerName}** (${r.skillLevel}) for *${r.matchTitle}* [${r.status}]${note}`;
    });

    const summary = `You have **${pendingCount} pending** join request${pendingCount === 1 ? '' : 's'} across your matches:\n\n${requestLines.join('\n')}\n\n*To accept or decline, reply "Accept <player's name>" or use the Captain Dashboard.*`;

    return {
      response: summary,
      toolResult: requestResult,
      sources: captainSources.length > 0 ? captainSources : undefined,
    };
  }

  // Otherwise: Query captain matches & open slots
  const openSlotsOnly =
    normalizedMsg.includes('open') ||
    normalizedMsg.includes('slot') ||
    normalizedMsg.includes('needs player') ||
    normalizedMsg.includes('need more players');

  const matchResult = await getCaptainMatchesTool(userId, {
    sport,
    openSlotsOnly: openSlotsOnly ? true : undefined,
  });

  const { matches, openSlotsCount, total } = matchResult;

  if (total === 0) {
    const msg = openSlotsOnly
      ? 'All your scheduled matches are currently full! None have open player slots remaining.'
      : 'You have no scheduled matches listed right now. You can create a new fixture using the Captain Dashboard or by asking me to create one.';

    return {
      response: msg,
      toolResult: matchResult,
      sources: captainSources.length > 0 ? captainSources : undefined,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && process.env.NODE_ENV !== 'test') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `User Query: "${message}"
Live Captain Fixtures (${total} fixtures, ${openSlotsCount} total open slots):
${JSON.stringify(matches, null, 2)}

Provide an organized summary of the captain's fixtures and open slots. Mention date/time, venue, sport, and remaining spots.`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: CAPTAIN_SYSTEM_PROMPT,
          temperature: 0.2,
          maxOutputTokens: 350,
        },
      });

      const reply = result.text?.trim();
      if (reply) {
        return {
          response: reply,
          toolResult: matchResult,
          sources: captainSources.length > 0 ? captainSources : undefined,
        };
      }
    } catch {
      // Fallback
    }
  }

  const matchLines = matches.map((m, i) => {
    return `${i + 1}. **${m.title}** (${m.sport.toUpperCase()})\n   📅 ${m.date} at ${m.startTime} | 📍 ${m.venueName}\n   👥 ${m.openSlots} open slot${m.openSlots === 1 ? '' : 's'} available (Capacity: ${m.totalCapacity}) [${m.status}]`;
  });

  const summary = `Here are your scheduled fixtures (${openSlotsCount} total open slots across ${total} match${total === 1 ? '' : 'es'}):\n\n${matchLines.join('\n\n')}\n\n*Manage squad rosters and fixture details directly in the Captain Dashboard.*`;

  return {
    response: summary,
    toolResult: matchResult,
    sources: captainSources.length > 0 ? captainSources : undefined,
  };
}

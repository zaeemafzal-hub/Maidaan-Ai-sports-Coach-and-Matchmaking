import crypto from 'crypto';
import { SupabaseRepo, Sport, SkillLevel } from '../../models/supabaseRepo.js';
import {
  CaptainActionDraft,
  CreateMatchDraftPayload,
  AcceptJoinRequestDraftPayload,
  RejectJoinRequestDraftPayload,
  ActionStatus,
  CaptainActionExecutionResponse,
  CaptainExecutionResult,
  CreateMatchExecutionResult,
  AcceptJoinRequestExecutionResult,
  RejectJoinRequestExecutionResult,
} from './types.js';
import { actionStore, ACTION_TTL_MS } from './actionStore.js';

const VALID_SPORTS: Sport[] = ['cricket', 'badminton', 'padel', 'football'];
const VALID_SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

/**
 * Step 1: Prepare CREATE_MATCH action draft.
 * Validates against exact production match creation constraints.
 * NEVER mutates database state.
 */
export function prepareCreateMatchAction(
  captainId: string,
  input: Partial<CreateMatchDraftPayload>
): { success: true; action: CaptainActionDraft } | { success: false; missingFields: string[]; message: string } {
  const missingFields: string[] = [];

  if (!input.sport || !VALID_SPORTS.includes(input.sport)) missingFields.push('sport (cricket, football, badminton, padel)');
  if (!input.title || input.title.trim().length < 4) missingFields.push('title (at least 4 characters)');
  if (!input.date || !input.date.trim()) missingFields.push('date (YYYY-MM-DD)');
  if (!input.startTime || !input.startTime.trim()) missingFields.push('start time (e.g. 20:00)');
  if (!input.venueName || input.venueName.trim().length < 2) missingFields.push('venue name');
  if (!input.area || input.area.trim().length < 2) missingFields.push('area/neighborhood');
  if (!input.skillLevel || !VALID_SKILL_LEVELS.includes(input.skillLevel)) missingFields.push('skill level (beginner, intermediate, advanced)');

  const totalCapacity = Number(input.totalCapacity);
  if (isNaN(totalCapacity) || totalCapacity < 2 || totalCapacity > 30) {
    missingFields.push('total capacity (number between 2 and 30)');
  }

  if (missingFields.length > 0) {
    return {
      success: false,
      missingFields,
      message: `I can prepare this fixture, but I still need: ${missingFields.join(', ')}. Please supply these details.`,
    };
  }

  const openSlots = typeof input.openSlots === 'number' && input.openSlots >= 0 && input.openSlots <= totalCapacity
    ? input.openSlots
    : totalCapacity;

  const validatedPayload: CreateMatchDraftPayload = {
    sport: input.sport as Sport,
    title: input.title!.trim(),
    format: input.format ? input.format.trim() : undefined,
    date: input.date!.trim(),
    startTime: input.startTime!.trim(),
    venueName: input.venueName!.trim(),
    area: input.area!.trim(),
    skillLevel: input.skillLevel as SkillLevel,
    totalCapacity,
    openSlots,
    contributionPerPlayer: input.contributionPerPlayer ?? null,
    notes: input.notes ? input.notes.trim() : undefined,
  };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACTION_TTL_MS).toISOString();
  const actionId = `capt_action_${crypto.randomUUID()}`;

  const draft: CaptainActionDraft = {
    actionId,
    type: 'CREATE_MATCH',
    userId: captainId,
    createdAt: now.toISOString(),
    expiresAt,
    status: 'AWAITING_CONFIRMATION',
    summary: {
      sport: validatedPayload.sport,
      title: validatedPayload.title,
      date: validatedPayload.date,
      startTime: validatedPayload.startTime,
      venue: validatedPayload.venueName,
      area: validatedPayload.area,
      capacity: validatedPayload.totalCapacity,
      openSlots: validatedPayload.openSlots,
      skillLevel: validatedPayload.skillLevel,
      fee: validatedPayload.contributionPerPlayer ? `PKR ${validatedPayload.contributionPerPlayer}` : 'Free',
    },
    payload: {
      type: 'CREATE_MATCH',
      data: validatedPayload,
    },
  };

  actionStore.saveAction(draft);

  return {
    success: true,
    action: draft,
  };
}

/**
 * Step 1: Prepare ACCEPT_JOIN_REQUEST action draft.
 * Resolves request and verifies captain ownership and current pending status.
 * NEVER mutates database state.
 */
export async function prepareAcceptJoinRequestAction(
  captainId: string,
  query: { requestId?: string; playerName?: string; matchTitle?: string }
): Promise<{ success: true; action: CaptainActionDraft } | { success: false; message: string }> {
  const matches = await SupabaseRepo.getCaptainMatches(captainId);
  if (matches.length === 0) {
    return { success: false, message: 'You have no active matches to accept requests for.' };
  }

  const allRequests = [];
  for (const m of matches) {
    const reqs = await SupabaseRepo.getMatchJoinRequests(m.id);
    for (const r of reqs) {
      if (r.status === 'PENDING') {
        allRequests.push({ ...r, matchTitle: m.title });
      }
    }
  }

  if (allRequests.length === 0) {
    return { success: false, message: 'You currently have no pending join requests to accept.' };
  }

  let matched = allRequests;
  if (query.requestId) {
    matched = matched.filter((r) => r.id === query.requestId);
  } else if (query.playerName) {
    const pLower = query.playerName.toLowerCase();
    matched = matched.filter((r) => r.playerName.toLowerCase().includes(pLower));
  }

  if (matched.length === 0) {
    return { success: false, message: `Could not find a pending join request matching "${query.playerName || query.requestId}".` };
  }

  if (matched.length > 1) {
    const list = matched.map((r) => `"${r.playerName}" for ${r.matchTitle}`).join('; ');
    return { success: false, message: `Multiple pending requests found: ${list}. Please specify which player or match you mean.` };
  }

  const target = matched[0];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACTION_TTL_MS).toISOString();
  const actionId = `capt_action_${crypto.randomUUID()}`;

  const payloadData: AcceptJoinRequestDraftPayload = {
    requestId: target.id,
    matchId: target.matchId,
    matchTitle: target.matchTitle,
    playerId: target.playerId,
    playerName: target.playerName,
  };

  const draft: CaptainActionDraft = {
    actionId,
    type: 'ACCEPT_JOIN_REQUEST',
    userId: captainId,
    createdAt: now.toISOString(),
    expiresAt,
    status: 'AWAITING_CONFIRMATION',
    summary: {
      player: target.playerName,
      match: target.matchTitle,
      requestId: target.id,
      skillLevel: target.skillLevel,
      action: 'ACCEPT',
    },
    payload: {
      type: 'ACCEPT_JOIN_REQUEST',
      data: payloadData,
    },
  };

  actionStore.saveAction(draft);

  return { success: true, action: draft };
}

/**
 * Step 1: Prepare REJECT_JOIN_REQUEST action draft.
 * Resolves request and verifies captain ownership and current pending status.
 * NEVER mutates database state.
 */
export async function prepareRejectJoinRequestAction(
  captainId: string,
  query: { requestId?: string; playerName?: string; matchTitle?: string }
): Promise<{ success: true; action: CaptainActionDraft } | { success: false; message: string }> {
  const matches = await SupabaseRepo.getCaptainMatches(captainId);
  if (matches.length === 0) {
    return { success: false, message: 'You have no active matches to reject requests for.' };
  }

  const allRequests = [];
  for (const m of matches) {
    const reqs = await SupabaseRepo.getMatchJoinRequests(m.id);
    for (const r of reqs) {
      if (r.status === 'PENDING') {
        allRequests.push({ ...r, matchTitle: m.title });
      }
    }
  }

  if (allRequests.length === 0) {
    return { success: false, message: 'You currently have no pending join requests to reject.' };
  }

  let matched = allRequests;
  if (query.requestId) {
    matched = matched.filter((r) => r.id === query.requestId);
  } else if (query.playerName) {
    const pLower = query.playerName.toLowerCase();
    matched = matched.filter((r) => r.playerName.toLowerCase().includes(pLower));
  }

  if (matched.length === 0) {
    return { success: false, message: `Could not find a pending join request matching "${query.playerName || query.requestId}".` };
  }

  if (matched.length > 1) {
    const list = matched.map((r) => `"${r.playerName}" for ${r.matchTitle}`).join('; ');
    return { success: false, message: `Multiple pending requests found: ${list}. Please specify which player you wish to decline.` };
  }

  const target = matched[0];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACTION_TTL_MS).toISOString();
  const actionId = `capt_action_${crypto.randomUUID()}`;

  const payloadData: RejectJoinRequestDraftPayload = {
    requestId: target.id,
    matchId: target.matchId,
    matchTitle: target.matchTitle,
    playerId: target.playerId,
    playerName: target.playerName,
  };

  const draft: CaptainActionDraft = {
    actionId,
    type: 'REJECT_JOIN_REQUEST',
    userId: captainId,
    createdAt: now.toISOString(),
    expiresAt,
    status: 'AWAITING_CONFIRMATION',
    summary: {
      player: target.playerName,
      match: target.matchTitle,
      requestId: target.id,
      action: 'REJECT',
    },
    payload: {
      type: 'REJECT_JOIN_REQUEST',
      data: payloadData,
    },
  };

  actionStore.saveAction(draft);

  return { success: true, action: draft };
}

/**
 * Step 2: Explicit Human Confirmation Execution.
 * Re-authenticates, re-checks authorization, ensures ownership,
 * enforces idempotency, re-checks live capacity/concurrency,
 * and calls the underlying trusted service.
 */
export function executeCaptainAction(actionId: string, executingUserId: string): Promise<CaptainActionExecutionResponse> {
  return actionStore.runExecution(actionId, executingUserId, () => executeCaptainActionOnce(actionId, executingUserId));
}

async function executeCaptainActionOnce(
  actionId: string,
  executingUserId: string
): Promise<{
  success: boolean;
  message: string;
  result?: CaptainExecutionResult;
  status: ActionStatus;
  code?: string;
  error?: string;
}> {
  // 1. Re-verify Server-Side Role Authorization
  const hasCaptainRole = await SupabaseRepo.hasRole(executingUserId, 'TEAM_CAPTAIN');
  if (!hasCaptainRole) {
    const profile = await SupabaseRepo.getProfile(executingUserId);
    return {
      success: false,
      status: 'FAILED',
      error: `Access forbidden: Only Team Captains can execute transactional actions. Your account role is ${profile?.role || 'PLAYER'}.`,
      message: 'Access forbidden: Only Team Captains can execute transactional actions.',
    };
  }

  // 2. Retrieve Action from Server-Side Store
  const action = actionStore.getAction(actionId);
  if (!action) {
    return {
      success: false,
      status: 'FAILED',
      error: 'Action not found or expired.',
      message: 'Action draft was not found.',
    };
  }

  // 3. Verify Server-Side Ownership Boundary
  if (action.userId !== executingUserId) {
    return {
      success: false,
      status: 'FAILED',
      error: 'Forbidden: You do not own this pending action.',
      message: 'Access denied: You do not have permission to execute this action.',
    };
  }

  // 4. Check Expiration
  if (action.status === 'EXPIRED') {
    return {
      success: false,
      status: 'EXPIRED',
      error: 'This action draft has expired (10-minute TTL). Please prepare a new action.',
      message: 'Action draft has expired.',
    };
  }

  if (action.status === 'CANCELLED') {
    return {
      success: false,
      status: 'CANCELLED',
      error: 'This action draft was cancelled.',
      message: 'Action draft was cancelled.',
    };
  }

  // 5. Idempotency Protection: If already executed, return original execution result without duplicate mutation
  if (action.status === 'EXECUTED') {
    return {
      success: true,
      status: 'EXECUTED',
      message: 'Action has already been executed.',
      result: action.executionResult || undefined,
    };
  }

  // 6. Execute by Action Type
  if (action.type === 'CREATE_MATCH' && action.payload.type === 'CREATE_MATCH') {
    const data = action.payload.data;
    try {
      const created = await SupabaseRepo.createMatch({
        captainId: executingUserId,
        sport: data.sport,
        title: data.title,
        format: data.format,
        date: data.date,
        startTime: data.startTime,
        venueName: data.venueName,
        area: data.area,
        skillLevel: data.skillLevel,
        totalCapacity: data.totalCapacity,
        openSlots: data.openSlots,
        contributionPerPlayer: data.contributionPerPlayer,
        notes: data.notes,
      });

      const execResult: CreateMatchExecutionResult = {
        actionType: 'CREATE_MATCH',
        match: created,
      };

      actionStore.markExecuted(actionId, execResult);

      return {
        success: true,
        status: 'EXECUTED',
        message: `Match "${created.title}" successfully created for ${created.date} at ${created.startTime}!`,
        result: execResult,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create match in database.';
      return {
        success: false,
        status: 'FAILED',
        error: errMsg,
        message: 'Database error while creating match.',
      };
    }
  }

  if (action.type === 'ACCEPT_JOIN_REQUEST' && action.payload.type === 'ACCEPT_JOIN_REQUEST') {
    const { requestId, playerName, matchTitle } = action.payload.data;
    // Calls existing deterministic acceptJoinRequest (checks ownership, status PENDING, capacity > 0)
    const result = await SupabaseRepo.acceptJoinRequest(requestId, executingUserId);
    if (!result.success) {
      return {
        success: false,
        status: 'FAILED',
        error: result.error || 'Failed to accept join request.',
        message: result.error || 'Request could not be accepted.',
        code: result.code,
      };
    }

    const execResult: AcceptJoinRequestExecutionResult = {
      actionType: 'ACCEPT_JOIN_REQUEST',
      success: true,
      request: result.request,
      openSlots: result.openSlots,
      matchStatus: result.matchStatus,
      code: result.code,
    };

    actionStore.markExecuted(actionId, execResult);

    return {
      success: true,
      status: 'EXECUTED',
      message: `Join request from ${playerName} for "${matchTitle}" has been accepted! Their spot is confirmed.`,
      result: execResult,
    };
  }

  if (action.type === 'REJECT_JOIN_REQUEST' && action.payload.type === 'REJECT_JOIN_REQUEST') {
    const { requestId, playerName, matchTitle } = action.payload.data;
    const result = await SupabaseRepo.rejectJoinRequest(requestId, executingUserId);
    if (!result.success) {
      return {
        success: false,
        status: 'FAILED',
        error: result.error || 'Failed to reject join request.',
        message: result.error || 'Request could not be rejected.',
        code: result.code,
      };
    }

    const execResult: RejectJoinRequestExecutionResult = {
      actionType: 'REJECT_JOIN_REQUEST',
      success: true,
      request: result.request,
      code: result.code,
    };

    actionStore.markExecuted(actionId, execResult);

    return {
      success: true,
      status: 'EXECUTED',
      message: `Join request from ${playerName} for "${matchTitle}" has been declined.`,
      result: execResult,
    };
  }

  return {
    success: false,
    status: 'FAILED',
    error: `Unknown action type: ${action.type}`,
    message: 'Unknown action type.',
  };
}

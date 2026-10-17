import { Sport, SkillLevel, MatchOutput, JoinRequestOutput } from '../../models/supabaseRepo.js';

export type CaptainActionType =
  | 'CREATE_MATCH'
  | 'ACCEPT_JOIN_REQUEST'
  | 'REJECT_JOIN_REQUEST';

export type ActionStatus =
  | 'DRAFT'
  | 'AWAITING_CONFIRMATION'
  | 'EXECUTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

export interface CreateMatchDraftPayload {
  sport: Sport;
  title: string;
  format?: string;
  date: string;
  startTime: string;
  venueName: string;
  area: string;
  skillLevel: SkillLevel;
  totalCapacity: number;
  openSlots: number;
  contributionPerPlayer?: number | null;
  notes?: string;
}

export interface AcceptJoinRequestDraftPayload {
  requestId: string;
  matchId: string;
  matchTitle: string;
  playerId: string;
  playerName: string;
}

export interface RejectJoinRequestDraftPayload {
  requestId: string;
  matchId: string;
  matchTitle: string;
  playerId: string;
  playerName: string;
}

export type CaptainActionPayload =
  | { type: 'CREATE_MATCH'; data: CreateMatchDraftPayload }
  | { type: 'ACCEPT_JOIN_REQUEST'; data: AcceptJoinRequestDraftPayload }
  | { type: 'REJECT_JOIN_REQUEST'; data: RejectJoinRequestDraftPayload };

export interface CreateMatchExecutionResult {
  actionType: 'CREATE_MATCH';
  match: MatchOutput;
}

export interface AcceptJoinRequestExecutionResult {
  actionType: 'ACCEPT_JOIN_REQUEST';
  success: boolean;
  request?: JoinRequestOutput;
  openSlots?: number;
  matchStatus?: 'OPEN' | 'FULL' | 'UPCOMING';
  code?: string;
  error?: string;
}

export interface RejectJoinRequestExecutionResult {
  actionType: 'REJECT_JOIN_REQUEST';
  success: boolean;
  request?: JoinRequestOutput;
  code?: string;
  error?: string;
}

export type CaptainExecutionResult =
  | CreateMatchExecutionResult
  | AcceptJoinRequestExecutionResult
  | RejectJoinRequestExecutionResult;

export interface CaptainActionDraft {
  actionId: string;
  type: CaptainActionType;
  userId: string;
  createdAt: string;
  expiresAt: string;
  status: ActionStatus;
  summary: Record<string, unknown>;
  payload: CaptainActionPayload;
  executionResult?: CaptainExecutionResult | null;
}

export interface CaptainActionSummary {
  actionId: string;
  type: CaptainActionType;
  status: ActionStatus;
  summary: Record<string, unknown>;
  expiresAt: string;
  executionResult?: CaptainExecutionResult | null;
}


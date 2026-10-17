import { api, ApiResponse } from './api';

export type AgentIntent =
  | 'MATCHMAKING'
  | 'COACHING'
  | 'WEATHER'
  | 'GENERAL'
  | 'HUB_DISCOVERY'
  | 'CAPTAIN';

export type AgentToolName =
  | 'searchMatchesTool'
  | 'getMatchDetailsTool'
  | 'getWeatherAdvisoryTool'
  | 'getCoachGuidanceTool'
  | 'searchHubsTool'
  | 'getHubDetailsTool'
  | 'getCaptainMatchesTool'
  | 'getCaptainPendingRequestsTool'
  | 'prepareCreateMatchAction'
  | 'prepareAcceptJoinRequestAction'
  | 'prepareRejectJoinRequestAction'
  | 'executeCaptainAction'
  | 'none';

export interface SourceMetadata {
  source?: string;
  section?: string;
  id?: string;
  title?: string;
  category?: string;
  score?: number;
}

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

export interface AgentMatchData {
  id: string;
  captainId: string;
  captainName?: string;
  teamName?: string;
  sport: string;
  title: string;
  format?: string;
  date: string;
  startTime: string;
  venueName: string;
  area: string;
  skillLevel: string;
  totalCapacity: number;
  openSlots: number;
  contributionPerPlayer?: number | null;
  notes?: string | null;
  status: 'OPEN' | 'FULL' | 'UPCOMING';
  mapPosition?: { x: number; y: number };
}

export interface AgentJoinRequestData {
  id: string;
  matchId: string;
  playerId: string;
  playerName?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  message?: string | null;
  matchTitle?: string;
  sport?: string;
  venueName?: string;
  date?: string;
  startTime?: string;
  skillLevel?: string;
  createdAt?: string;
}

export interface AgentHubData {
  id: string;
  name: string;
  hubName?: string;
  userId?: string;
  contactNumber?: string | null;
  sports: string[];
  location: string;
  courtCount: number;
  isVerified: boolean;
}

export interface AgentWeatherData {
  location: string;
  temperatureC: number;
  condition: string;
  rainProbability: number;
  windSpeedKmh: number;
  recommendation: 'OUTDOOR_SUITABLE' | 'CAUTION' | 'INDOOR_PREFERRED';
  reason: string;
  timestamp: string;
  isFallback: boolean;
}

export interface CreateMatchDraftSummary {
  sport?: string;
  title?: string;
  venue?: string;
  area?: string;
  date?: string;
  time?: string;
  capacity?: number;
  skillLevel?: string;
  contributionPerPlayer?: number | null;
  [key: string]: unknown;
}

export interface JoinRequestDraftSummary {
  player?: string;
  match?: string;
  requestId?: string;
  action?: 'ACCEPT' | 'REJECT' | string;
  [key: string]: unknown;
}

export interface CaptainActionSummary {
  actionId: string;
  type: CaptainActionType;
  status: ActionStatus;
  summary: CreateMatchDraftSummary & JoinRequestDraftSummary;
  expiresAt: string;
  executionResult?: {
    actionType: CaptainActionType;
    match?: AgentMatchData;
    success?: boolean;
    request?: AgentJoinRequestData;
    openSlots?: number;
    matchStatus?: string;
    code?: string;
    error?: string;
  } | null;
}

export interface AgentChatResponse {
  intent: AgentIntent;
  message: string;
  toolUsed: AgentToolName;
  toolResult: Record<string, unknown> | null;
  data: Record<string, unknown> | null;
  action?: CaptainActionSummary | null;
  sources?: SourceMetadata[] | null;
  requestId: string;
  durationMs: number;
}

export interface ActionExecutionResponse {
  success: boolean;
  message: string;
  result?: {
    actionType: CaptainActionType;
    match?: AgentMatchData;
    success?: boolean;
    request?: AgentJoinRequestData;
    openSlots?: number;
    matchStatus?: string;
    code?: string;
    error?: string;
  };
  status: ActionStatus;
  code?: string;
  error?: string;
}

export interface ActionCancelResponse {
  success: boolean;
  message: string;
  status: 'CANCELLED';
  actionId: string;
}

export interface ActionDetailResponse {
  action: {
    actionId: string;
    type: CaptainActionType;
    userId: string;
    createdAt: string;
    expiresAt: string;
    status: ActionStatus;
    summary: Record<string, unknown>;
    payload: unknown;
    executionResult?: unknown;
  };
}

class AgentService {
  /**
   * Primary conversational assistant endpoint.
   * Dispatches user message to LangGraph agent with Supabase authentication.
   */
  async chat(message: string): Promise<ApiResponse<AgentChatResponse>> {
    return api.post<AgentChatResponse>('/api/agent/chat', { message });
  }

  /**
   * Explicitly executes a pending two-phase captain action draft.
   */
  async confirmAction(actionId: string): Promise<ApiResponse<ActionExecutionResponse>> {
    return api.post<ActionExecutionResponse>(`/api/agent/actions/${actionId}/confirm`);
  }

  /**
   * Explicitly cancels a pending two-phase captain action draft.
   */
  async cancelAction(actionId: string): Promise<ApiResponse<ActionCancelResponse>> {
    return api.post<ActionCancelResponse>(`/api/agent/actions/${actionId}/cancel`);
  }

  /**
   * Retrieves live status of a pending action draft.
   */
  async getAction(actionId: string): Promise<ApiResponse<ActionDetailResponse>> {
    return api.get<ActionDetailResponse>(`/api/agent/actions/${actionId}`);
  }
}

export const agentService = new AgentService();

import { Sport, SkillLevel, Role } from '../models/supabaseRepo.js';
import { SourceMetadata } from '../rag/types.js';

export type AgentIntent =
  | 'MATCHMAKING'
  | 'COACHING'
  | 'WEATHER'
  | 'GENERAL'
  | 'HUB_DISCOVERY'
  | 'CAPTAIN'
  | 'ADMIN';

export interface AgentClassificationResult {
  intent: AgentIntent;
  sport?: Sport;
  area?: string;
  skillLevel?: SkillLevel;
  confidence?: number;
  reasoning?: string;
}

export interface AgentChatRequest {
  message: string;
}

// ---------------------------------------------------------------------------
// Strictly Typed Tool Result Structures (Zero `any`)
// ---------------------------------------------------------------------------

export interface MatchSummary {
  id: string;
  title: string;
  sport: Sport;
  date: string;
  startTime: string;
  venueName: string;
  area: string;
  skillLevel: SkillLevel;
  totalCapacity: number;
  openSlots: number;
  contributionPerPlayer?: number | null;
}

export interface MatchSearchResult {
  tool: 'searchMatchesTool';
  totalFound: number;
  matches: MatchSummary[];
  criteria: {
    sport?: Sport;
    area?: string;
    skillLevel?: SkillLevel;
  };
}

export interface WeatherResult {
  tool: 'getWeatherForecastTool';
  location: string;
  temperatureC: number;
  condition: string;
  rainProbability: number;
  windSpeedKmh: number;
  recommendation: 'OUTDOOR_SUITABLE' | 'CAUTION' | 'INDOOR_PREFERRED';
  reason: string;
  timestamp: string;
  isFallback: boolean;
  error?: string;
}

export interface HubSummary {
  id: string;
  name: string;
  location: string;
  sports: Sport[];
  courtCount: number;
  isVerified: boolean;
  contactNumber?: string | null;
}

export interface HubSearchResult {
  tool: 'searchHubsTool';
  hubs: HubSummary[];
  totalFound: number;
  criteria: {
    sport?: Sport;
    area?: string;
    verifiedOnly?: boolean;
  };
}

export interface CaptainMatchSummary {
  id: string;
  title: string;
  sport: Sport;
  date: string;
  startTime: string;
  venueName: string;
  area: string;
  skillLevel: SkillLevel;
  totalCapacity: number;
  openSlots: number;
  status: string;
  contributionPerPlayer?: number | null;
}

export interface CaptainMatchesResult {
  tool: 'getCaptainMatchesTool';
  matches: CaptainMatchSummary[];
  total: number;
  openSlotsCount: number;
}

export interface CaptainJoinRequestSummary {
  id: string;
  matchId: string;
  matchTitle: string;
  sport: Sport;
  playerId: string;
  playerName: string;
  skillLevel: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  message?: string | null;
  createdAt: string;
}

export interface CaptainJoinRequestsResult {
  tool: 'getCaptainJoinRequestsTool';
  requests: CaptainJoinRequestSummary[];
  pendingCount: number;
  total: number;
}

export interface CoachingResult {
  tool: 'coachingProvider';
  sport: Sport;
  provider?: string;
  requestId?: string;
  isFallback?: boolean;
  usedBackup?: boolean;
}

import { CaptainActionSummary } from './actions/types.js';
export * from './actions/types.js';

export type AgentToolName =
  | 'searchMatchesTool'
  | 'getWeatherForecastTool'
  | 'searchHubsTool'
  | 'getCaptainMatchesTool'
  | 'getCaptainJoinRequestsTool'
  | 'prepareCreateMatchAction'
  | 'prepareAcceptJoinRequestAction'
  | 'prepareRejectJoinRequestAction'
  | 'executeCaptainAction'
  | 'coachingProvider'
  | 'none';

export type AgentToolResult =
  | MatchSearchResult
  | WeatherResult
  | HubSearchResult
  | CaptainMatchesResult
  | CaptainJoinRequestsResult
  | CoachingResult
  | null;

// ---------------------------------------------------------------------------
// HTTP Response Contract
// ---------------------------------------------------------------------------

export interface AgentChatResponse {
  synthesis?: {provider: string; usedBackup: boolean};
  intent: AgentIntent;
  message: string;
  toolUsed?: AgentToolName;
  toolResult?: AgentToolResult;
  data?: AgentToolResult; // Backward-compatible alias
  action?: CaptainActionSummary | null;
  sources?: SourceMetadata[] | null;
  requestId: string;
  durationMs: number;
}

import type { CoachSport } from './index';
import type { AgentIntent, CaptainActionSummary, SourceMetadata } from '../services/agentService';

export interface CoachMessage {
  id: string;
  sender: 'COACH' | 'PLAYER';
  sport: CoachSport;
  text: string;
  timestamp: string;
  drillPlan?: {
    title: string;
    objective: string;
    cues: string[];
    routine: { sets: string; reps: string; duration: string; setup: string };
    proTip: string;
  };
  disclaimer?: string;
}

export interface ConciergeMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  intent?: AgentIntent;
  toolResult?: Record<string, unknown> | null;
  action?: CaptainActionSummary | null;
  sources?: SourceMetadata[] | null;
  timestamp: string;
}

export interface SavedAssistantMessage {
  id: string;
  clientMessageId: string;
  role: 'user' | 'assistant';
  text: string;
  details: {
    intent?: AgentIntent;
    toolResult?: Record<string, unknown> | null;
    action?: CaptainActionSummary | null;
    sources?: SourceMetadata[] | null;
    error?: boolean;
  };
  createdAt: string;
}

export type AssistantKind = 'coach' | 'concierge';
export interface AssistantHistoryPage {
  conversationId: string;
  messages: SavedAssistantMessage[];
  nextBefore: string | null;
}

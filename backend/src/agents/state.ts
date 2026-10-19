import { Annotation } from '@langchain/langgraph';
import { Role, Sport, SkillLevel } from '../models/supabaseRepo.js';
import { AgentIntent, AgentToolResult, CaptainActionSummary } from './types.js';
import { RetrievedKnowledge, SourceMetadata } from '../rag/types.js';

export const AgentStateAnnotation = Annotation.Root({
  userId: Annotation<string>(),
  role: Annotation<Role | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  message: Annotation<string>(),
  intent: Annotation<AgentIntent>({
    reducer: (_, next) => next,
    default: () => 'GENERAL',
  }),
  sport: Annotation<Sport | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  area: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  skillLevel: Annotation<SkillLevel | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  toolResult: Annotation<AgentToolResult | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  response: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  synthesis: Annotation<{provider: string; usedBackup: boolean} | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  action: Annotation<CaptainActionSummary | null>({
    reducer: (_, next) => (next !== undefined ? next : null),
    default: () => null,
  }),
  error: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  retrievedKnowledge: Annotation<RetrievedKnowledge[] | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  sources: Annotation<SourceMetadata[] | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  requestId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  startTime: Annotation<number>({
    reducer: (_, next) => next,
    default: () => Date.now(),
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
export type AgentUpdate = typeof AgentStateAnnotation.Update;

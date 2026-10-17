export type CoachSport = 'cricket' | 'football' | 'badminton' | 'padel';

export type ConversationRole = 'user' | 'assistant';

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
}

export interface CoachProviderInput {
  sport: CoachSport;
  message: string;
  conversation?: ConversationMessage[];
}

export interface CoachProviderResponse {
  message: string;
  sport: CoachSport;
  provider: string;
  requestId?: string;
  usedBackup?: boolean;
}

export interface TextGenerationInput {
  systemPrompt: string;
  message: string;
  conversation?: ConversationMessage[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface TextGenerationResponse {
  message: string;
  provider: string;
  usedBackup?: boolean;
}

export interface TextAIProvider extends AIProvider {
  generateText(input: TextGenerationInput): Promise<TextGenerationResponse>;
}

export class AIProviderError extends Error {
  constructor(message: string, public readonly status = 503, public readonly code = 'AI_UNAVAILABLE') {
    super(message);
    this.name = 'AIProviderError';
  }
}

export interface AIProvider {
  readonly name: string;
  generateCoachResponse(input: CoachProviderInput): Promise<CoachProviderResponse>;
}

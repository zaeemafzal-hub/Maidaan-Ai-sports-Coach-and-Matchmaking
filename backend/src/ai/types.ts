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
}

export interface AIProvider {
  readonly name: string;
  generateCoachResponse(input: CoachProviderInput): Promise<CoachProviderResponse>;
}

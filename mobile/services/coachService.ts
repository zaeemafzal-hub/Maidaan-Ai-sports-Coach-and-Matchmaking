import { api, ApiResponse } from './api';
import { CoachSport, CoachConversationMessage, CoachResponse } from '../types';

export interface SendCoachMessageInput {
  sport: CoachSport;
  message: string;
  conversation?: CoachConversationMessage[];
}

export const coachService = {
  /**
   * POST /api/coach/chat
   * Sends user query and optional prior conversation turns to backend AI Coach.
   */
  async sendCoachMessage(
    input: SendCoachMessageInput
  ): Promise<ApiResponse<CoachResponse>> {
    return api.post<CoachResponse>('/api/coach/chat', {
      sport: input.sport,
      message: input.message.trim(),
      conversation: input.conversation,
    });
  },
};

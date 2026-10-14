import { api } from './api';
import { Sport, SkillLevel } from '../types';

export type JoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface JoinRequest {
  id: string;
  matchId: string;
  playerId: string;
  status: JoinRequestStatus;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
  matchTitle?: string;
  sport?: Sport;
  venueName?: string;
  date?: string;
  startTime?: string;
}

export interface CaptainJoinRequest {
  id: string;
  matchId: string;
  playerId: string;
  playerName: string;
  preferredSports: Sport[];
  skillLevel: SkillLevel;
  primaryLocation: string;
  status: JoinRequestStatus;
  message?: string | null;
  createdAt: string;
}

export interface AcceptJoinRequestResponse {
  request: JoinRequest;
  openSlots?: number;
  matchStatus?: 'OPEN' | 'FULL' | 'UPCOMING';
  message?: string;
}

export const joinRequestService = {
  /**
   * POST /api/matches/:id/join
   * Player submits a join request for a specific match fixture.
   */
  async createJoinRequest(matchId: string, message?: string): Promise<JoinRequest> {
    const res = await api.post<JoinRequest>(`/api/matches/${matchId}/join`, {
      message: message ? message.trim() : undefined,
    });

    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to submit join request.');
    }

    return res.data;
  },

  /**
   * GET /api/join-requests/me
   * Retrieve current player's join requests with fixture summary.
   */
  async getMyJoinRequests(): Promise<JoinRequest[]> {
    const res = await api.get<{ requests: JoinRequest[] }>('/api/join-requests/me');

    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to load your join requests.');
    }

    if (Array.isArray(res.data.requests)) {
      return res.data.requests;
    }

    return [];
  },

  /**
   * GET /api/matches/:id/requests
   * Captain retrieves all join requests for an owned match fixture.
   */
  async getMatchJoinRequests(matchId: string): Promise<CaptainJoinRequest[]> {
    const res = await api.get<{ requests: CaptainJoinRequest[] }>(`/api/matches/${matchId}/requests`);

    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to load join requests for this fixture.');
    }

    if (Array.isArray(res.data.requests)) {
      return res.data.requests;
    }

    return [];
  },

  /**
   * PATCH /api/join-requests/:id
   * Captain accepts or rejects a join request.
   */
  async updateJoinRequest(
    requestId: string,
    action: 'ACCEPT' | 'REJECT'
  ): Promise<AcceptJoinRequestResponse> {
    const res = await api.patch<AcceptJoinRequestResponse>(`/api/join-requests/${requestId}`, {
      action,
    });

    if (res.error || !res.data) {
      throw new Error(res.error || `Failed to ${action.toLowerCase()} request.`);
    }

    return res.data;
  },
};

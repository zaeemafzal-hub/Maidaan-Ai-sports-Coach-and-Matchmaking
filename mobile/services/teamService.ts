import { api } from './api';
import { Sport, SkillLevel } from '../types';

export type TeamMemberRole = 'CAPTAIN' | 'PLAYER' | 'VICE_CAPTAIN';
export type TeamMemberStatus = 'ACTIVE' | 'INACTIVE';

export interface TeamModel {
  id: string;
  captainId: string;
  name: string;
  sport: Sport;
  skillLevel: SkillLevel;
  area: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface TeamMemberModel {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  memberRole: TeamMemberRole;
  status: TeamMemberStatus;
  joinedAt: string;
  skillLevel?: SkillLevel;
  preferredSports?: Sport[];
}

export interface CreateTeamPayload {
  name: string;
  sport: Sport;
  skillLevel: SkillLevel;
  area: string;
}

export interface UpdateTeamPayload {
  name?: string;
  sport?: Sport;
  skillLevel?: SkillLevel;
  area?: string;
}

export const teamService = {
  /**
   * GET /api/captain/team
   * Retrieve the authenticated captain's team. Returns null if not found.
   */
  async getMyTeam(): Promise<TeamModel | null> {
    const res = await api.get<{ team: TeamModel }>('/api/captain/team');
    if (res.status === 404) {
      return null;
    }
    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to fetch team profile.');
    }
    return res.data.team;
  },

  /**
   * POST /api/captain/team
   * Create a new team for the authenticated captain.
   */
  async createTeam(payload: CreateTeamPayload): Promise<TeamModel> {
    const res = await api.post<{ team: TeamModel; message: string }>('/api/captain/team', payload);
    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to create team.');
    }
    return res.data.team;
  },

  /**
   * PATCH /api/captain/team
   * Update the authenticated captain's team.
   */
  async updateTeam(payload: UpdateTeamPayload): Promise<TeamModel> {
    const res = await api.patch<{ team: TeamModel; message: string }>('/api/captain/team', payload);
    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to update team.');
    }
    return res.data.team;
  },

  /**
   * GET /api/captain/team/members
   * Retrieve the team roster.
   */
  async getTeamMembers(): Promise<TeamMemberModel[]> {
    const res = await api.get<{ members: TeamMemberModel[] }>('/api/captain/team/members');
    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to load team roster.');
    }
    return res.data.members || [];
  },

  /**
   * POST /api/captain/team/members
   * Add a member to the roster.
   */
  async addTeamMember(payload: {
    userId: string;
    memberRole?: TeamMemberRole;
    status?: TeamMemberStatus;
  }): Promise<TeamMemberModel> {
    const res = await api.post<{ member: TeamMemberModel; message: string }>(
      '/api/captain/team/members',
      payload
    );
    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to add team member.');
    }
    return res.data.member;
  },

  /**
   * DELETE /api/captain/team/members/:userId
   * Remove a member from the roster.
   */
  async removeTeamMember(userId: string): Promise<void> {
    const res = await api.delete<{ message: string }>(`/api/captain/team/members/${userId}`);
    if (res.error) {
      throw new Error(res.error || 'Failed to remove team member.');
    }
  },
};

import { api } from './api';
import { MatchSlotItem } from '../constants/matches';
import { Sport, SkillLevel } from '../types';

export interface CreateMatchPayload {
  teamId?: string;
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
  notes?: string | null;
  schematicMapPosition?: { x: number; y: number };
}

export interface BackendMatchRecord {
  id: string;
  captainId: string;
  captainName?: string;
  teamId?: string;
  teamName?: string;
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
  notes?: string | null;
  status: 'OPEN' | 'FULL' | 'UPCOMING';
  mapPosition?: { x: number; y: number };
  createdAt?: string;
  updatedAt?: string;
}

const SPORT_LABELS: Record<Sport, string> = {
  cricket: 'Cricket',
  badminton: 'Badminton',
  padel: 'Padel',
  football: 'Football',
};

export function toFrontendMatch(item: BackendMatchRecord): MatchSlotItem {
  const sportLabel = SPORT_LABELS[item.sport] || 'Sport';
  const feeLabel = item.contributionPerPlayer
    ? `Rs. ${item.contributionPerPlayer.toLocaleString()}`
    : 'Free';

  const skillFormatted =
    item.skillLevel.charAt(0).toUpperCase() + item.skillLevel.slice(1);

  return {
    id: item.id,
    title: item.title,
    sport: item.sport,
    sportLabel,
    format: item.format || `${sportLabel} Match`,
    date: item.date,
    time: item.startTime,
    startTime: item.startTime,
    duration: '90 Mins',
    groundName: item.venueName,
    area: item.area,
    slotsOpen: item.openSlots,
    totalSlots: item.totalCapacity,
    skillLevel: skillFormatted,
    feePerPlayer: feeLabel,
    captainName: item.captainName || 'Match Host',
    captainId: item.captainId,
    teamName: item.teamName,
    description:
      item.notes ||
      `${item.format || sportLabel} fixture organized by ${
        item.captainName || 'Team Captain'
      }. Contact host or request to join.`,
    venueNotes: `${item.venueName}, ${item.area}. On-site facilities and sports amenities available.`,
    confirmedPlayers: [
      {
        id: `p-${item.captainId.slice(0, 4)}`,
        name: item.captainName || 'Captain',
        isCaptain: true,
      },
    ],
    coordinates:
      item.mapPosition &&
      typeof item.mapPosition.x === 'number' &&
      typeof item.mapPosition.y === 'number'
        ? item.mapPosition
        : { x: 50, y: 50 },
  };
}

export const matchService = {
  /**
   * GET /api/matches
   * Retrieve discoverable match listings from PostgreSQL.
   */
  async getMatches(filters?: {
    sport?: Sport;
    area?: string;
    skillLevel?: SkillLevel;
  }): Promise<MatchSlotItem[]> {
    let endpoint = '/api/matches';
    const queryParams: string[] = [];

    if (filters?.sport) queryParams.push(`sport=${encodeURIComponent(filters.sport)}`);
    if (filters?.area) queryParams.push(`area=${encodeURIComponent(filters.area)}`);
    if (filters?.skillLevel) queryParams.push(`skillLevel=${encodeURIComponent(filters.skillLevel)}`);

    if (queryParams.length > 0) {
      endpoint += `?${queryParams.join('&')}`;
    }

    const res = await api.get<{ matches: BackendMatchRecord[] }>(endpoint);

    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to retrieve match listings from server.');
    }

    if (Array.isArray(res.data.matches)) {
      return res.data.matches.map(toFrontendMatch);
    }

    return [];
  },

  /**
   * GET /api/matches/:id
   * Fetch single match details. Returns null if 404.
   */
  async getMatchById(id: string): Promise<MatchSlotItem | null> {
    const res = await api.get<BackendMatchRecord>(`/api/matches/${id}`);

    if (res.status === 404) {
      return null;
    }

    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to retrieve match fixture from server.');
    }

    return toFrontendMatch(res.data);
  },

  /**
   * GET /api/captain/matches
   * Fetch matches owned by authenticated team captain.
   */
  async getCaptainMatches(): Promise<MatchSlotItem[]> {
    const res = await api.get<{ matches: BackendMatchRecord[] }>('/api/captain/matches');

    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to retrieve captain match listings from server.');
    }

    if (Array.isArray(res.data.matches)) {
      return res.data.matches.map(toFrontendMatch);
    }

    return [];
  },

  /**
   * POST /api/matches
   * Create and persist new match fixture on backend.
   */
  async createMatch(payload: CreateMatchPayload): Promise<MatchSlotItem> {
    const res = await api.post<BackendMatchRecord>('/api/matches', payload);

    if (!res.data || res.error) {
      throw new Error(res.error || 'Failed to create match fixture.');
    }

    return toFrontendMatch(res.data);
  },

  /**
   * PATCH /api/captain/matches/:id/recruitment
   * Safely update open slots and derived recruitment state.
   */
  async updateMatchRecruitment(matchId: string, openSlots: number): Promise<BackendMatchRecord> {
    const res = await api.patch<{ match: BackendMatchRecord; message: string }>(
      `/api/captain/matches/${matchId}/recruitment`,
      { openSlots }
    );

    if (!res.data || res.error) {
      throw new Error(res.error || 'Failed to update match recruitment.');
    }

    return res.data.match;
  },
};

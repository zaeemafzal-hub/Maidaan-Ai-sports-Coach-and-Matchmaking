import { SupabaseRepo, Sport, SkillLevel, JoinRequestStatus } from '../../models/supabaseRepo.js';
import {
  CaptainMatchSummary,
  CaptainMatchesResult,
  CaptainJoinRequestSummary,
  CaptainJoinRequestsResult,
} from '../types.js';

export interface CaptainMatchesFilter {
  sport?: Sport;
  status?: string;
  openSlotsOnly?: boolean;
}

export interface CaptainJoinRequestsFilter {
  matchId?: string;
  status?: JoinRequestStatus;
}

/**
 * Deterministic tool to retrieve fixtures hosted by the authenticated team captain.
 * Security: captainId is derived strictly from server-side authenticated context.
 */
export async function getCaptainMatchesTool(
  captainId: string,
  filter?: CaptainMatchesFilter
): Promise<CaptainMatchesResult> {
  const matches = await SupabaseRepo.getCaptainMatches(captainId);

  let filtered = matches;
  if (filter?.sport) {
    filtered = filtered.filter((m) => m.sport === filter.sport);
  }
  if (filter?.status) {
    filtered = filtered.filter((m) => m.status.toUpperCase() === filter.status!.toUpperCase());
  }
  if (filter?.openSlotsOnly) {
    filtered = filtered.filter((m) => m.openSlots > 0);
  }

  const summaries: CaptainMatchSummary[] = filtered.map((m) => ({
    id: m.id,
    title: m.title,
    sport: m.sport,
    date: m.date,
    startTime: m.startTime,
    venueName: m.venueName,
    area: m.area,
    skillLevel: m.skillLevel,
    totalCapacity: m.totalCapacity,
    openSlots: m.openSlots,
    status: m.status,
    contributionPerPlayer: m.contributionPerPlayer,
  }));

  const openSlotsCount = summaries.reduce((acc, m) => acc + m.openSlots, 0);

  return {
    tool: 'getCaptainMatchesTool',
    matches: summaries,
    total: summaries.length,
    openSlotsCount,
  };
}

/**
 * Deterministic tool to retrieve join requests for matches owned by the authenticated captain.
 * Security: Enforces ownership boundary so no captain can inspect another captain's applicants.
 */
export async function getCaptainJoinRequestsTool(
  captainId: string,
  filter?: CaptainJoinRequestsFilter
): Promise<CaptainJoinRequestsResult> {
  const captainMatches = await SupabaseRepo.getCaptainMatches(captainId);

  if (captainMatches.length === 0) {
    return {
      tool: 'getCaptainJoinRequestsTool',
      requests: [],
      pendingCount: 0,
      total: 0,
    };
  }

  const matchMap = new Map(captainMatches.map((m) => [m.id, m]));
  const targetMatchIds = filter?.matchId
    ? captainMatches.filter((m) => m.id === filter.matchId).map((m) => m.id)
    : captainMatches.map((m) => m.id);

  const allRequests: CaptainJoinRequestSummary[] = [];

  for (const matchId of targetMatchIds) {
    const match = matchMap.get(matchId)!;
    const matchRequests = await SupabaseRepo.getMatchJoinRequests(matchId);

    for (const r of matchRequests) {
      if (filter?.status && r.status !== filter.status) {
        continue;
      }
      allRequests.push({
        id: r.id,
        matchId: r.matchId,
        matchTitle: match.title,
        sport: match.sport,
        playerId: r.playerId,
        playerName: r.playerName,
        skillLevel: r.skillLevel,
        status: r.status,
        message: r.message,
        createdAt: r.createdAt,
      });
    }
  }

  // Sort newest first
  allRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pendingCount = allRequests.filter((r) => r.status === 'PENDING').length;

  return {
    tool: 'getCaptainJoinRequestsTool',
    requests: allRequests,
    pendingCount,
    total: allRequests.length,
  };
}

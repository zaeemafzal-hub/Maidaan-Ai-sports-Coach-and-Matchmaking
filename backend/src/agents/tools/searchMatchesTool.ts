import { SupabaseRepo, Sport, SkillLevel } from '../../models/supabaseRepo.js';
import { MatchSummary, MatchSearchResult } from '../types.js';

export interface SearchMatchesInput {
  sport?: Sport;
  area?: string;
  skillLevel?: SkillLevel;
}

export async function searchMatchesTool(input: SearchMatchesInput): Promise<MatchSearchResult> {
  const allMatches = await SupabaseRepo.getMatches({
    sport: input.sport,
    area: input.area,
    skillLevel: input.skillLevel,
  });

  const normalized: MatchSummary[] = allMatches.map((m) => ({
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
    contributionPerPlayer: m.contributionPerPlayer,
  }));

  return {
    tool: 'searchMatchesTool',
    matches: normalized,
    totalFound: normalized.length,
    criteria: input,
  };
}

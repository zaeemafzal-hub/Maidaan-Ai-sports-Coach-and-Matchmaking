import { SupabaseRepo, MatchOutput } from '../../models/supabaseRepo.js';

export async function getMatchDetailsTool(matchId: string): Promise<MatchOutput | null> {
  if (!matchId || typeof matchId !== 'string') {
    return null;
  }
  return SupabaseRepo.getMatchById(matchId);
}

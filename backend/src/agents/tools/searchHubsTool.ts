import { SupabaseRepo, Sport } from '../../models/supabaseRepo.js';
import { HubSummary, HubSearchResult } from '../types.js';

export interface SearchHubsInput {
  sport?: Sport;
  area?: string;
  verifiedOnly?: boolean;
}

/**
 * Deterministic backend tool for discovering live sports hubs and venues.
 * Never fabricates hubs or attributes; queries exclusively from Supabase / trusted store.
 */
export async function searchHubsTool(input: SearchHubsInput): Promise<HubSearchResult> {
  const records = await SupabaseRepo.getHubs({
    sport: input.sport,
    area: input.area,
    verifiedOnly: input.verifiedOnly,
  });

  const hubs: HubSummary[] = records.map((h) => ({
    id: h.user_id,
    name: h.hub_name,
    location: h.location,
    sports: h.sports,
    courtCount: h.court_count,
    isVerified: h.is_verified,
    contactNumber: h.contact_number || null,
  }));

  return {
    tool: 'searchHubsTool',
    hubs,
    totalFound: hubs.length,
    criteria: input,
  };
}

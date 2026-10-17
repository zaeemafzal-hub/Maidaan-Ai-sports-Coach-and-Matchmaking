import { SupabaseRepo, ProfileRecord, PlayerProfileRecord } from '../../models/supabaseRepo.js';

export interface PlayerContext {
  userId: string;
  name: string;
  email: string;
  role: string;
  playerProfile?: PlayerProfileRecord | null;
}

export async function getPlayerContextTool(userId: string): Promise<PlayerContext | null> {
  if (!userId || typeof userId !== 'string') {
    return null;
  }

  const profile = await SupabaseRepo.getProfile(userId);
  if (!profile) {
    return null;
  }

  const playerProfile = await SupabaseRepo.getPlayerProfile(userId);

  return {
    userId: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    playerProfile: playerProfile || null,
  };
}

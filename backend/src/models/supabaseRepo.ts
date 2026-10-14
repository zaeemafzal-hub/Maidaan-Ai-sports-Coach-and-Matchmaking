import crypto from 'crypto';
import { supabaseAdmin, isServerSupabaseConfigured } from '../lib/supabase.js';

export type Role = 'PLAYER' | 'TEAM_CAPTAIN' | 'HUB_OWNER' | 'ADMIN';
export type Sport = 'cricket' | 'badminton' | 'padel' | 'football';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ProfileRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerProfileRecord {
  user_id: string;
  preferred_sports: Sport[];
  skill_level: SkillLevel;
  primary_location: string;
  matches_played: number;
  created_at: string;
  updated_at: string;
}

export interface CaptainProfileRecord {
  user_id: string;
  team_name: string;
  sports: Sport[];
  skill_level?: SkillLevel;
  primary_location: string;
  created_at: string;
  updated_at: string;
}

export interface HubOwnerProfileRecord {
  user_id: string;
  hub_name: string;
  contact_number?: string;
  sports: Sport[];
  location: string;
  court_count: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type CourtStatus = 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';

export interface HubCourtDbRecord {
  id: string;
  hub_owner_id: string;
  name: string;
  sport: Sport;
  status: CourtStatus;
  created_at: string;
  updated_at: string;
}

export interface HubCourtOutput {
  id: string;
  hubOwnerId: string;
  name: string;
  sport: Sport;
  status: CourtStatus;
  createdAt: string;
  updatedAt: string;
}

export type HubVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface HubVerificationRequestDbRecord {
  id: string;
  hub_owner_id: string;
  status: HubVerificationStatus;
  admin_note?: string | null;
  reviewed_by?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HubVerificationOutput {
  id: string;
  hubOwnerId: string;
  status: HubVerificationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  adminNote: string | null;
}

export interface AdminHubVerificationOutput {
  requestId: string;
  hubOwnerId: string;
  hubName: string;
  contactNumber: string | null;
  sports: Sport[];
  location: string;
  courtCount: number;
  isVerified: boolean;
  status: HubVerificationStatus;
  adminNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReportCategory = 'CONDUCT' | 'HARASSMENT' | 'UNSAFE_BEHAVIOR' | 'SPAM' | 'OTHER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'FOLLOW_UP';

export interface ReportDbRecord {
  id: string;
  reporter_id: string;
  reported_user_id?: string | null;
  match_id?: string | null;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  admin_note?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface ReportOutput {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  matchId: string | null;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  adminNote: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AdminReportOutput {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string | null;
  reportedUserName: string | null;
  matchId: string | null;
  matchTitle: string | null;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  adminNote: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface MatchDbRecord {
  id: string;
  captain_id: string;
  sport: Sport;
  title: string;
  format?: string | null;
  date: string;
  start_time: string;
  venue_name: string;
  area: string;
  skill_level: SkillLevel;
  total_capacity: number;
  open_slots: number;
  contribution_per_player?: number | null;
  notes?: string | null;
  status: 'OPEN' | 'FULL' | 'UPCOMING';
  schematic_x?: number | null;
  schematic_y?: number | null;
  created_at: string;
  updated_at: string;
}

export interface MatchOutput {
  id: string;
  captainId: string;
  captainName: string;
  teamName: string;
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
  mapPosition: { x: number; y: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMatchInput {
  captainId: string;
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
  mapPosition?: { x: number; y: number };
}

export type JoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface JoinRequestDbRecord {
  id: string;
  match_id: string;
  player_id: string;
  status: JoinRequestStatus;
  message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchParticipantDbRecord {
  id: string;
  match_id: string;
  player_id: string;
  joined_at: string;
}

export interface JoinRequestOutput {
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

export interface MatchRequestWithPlayerOutput {
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

export type NotificationType =
  | 'JOIN_REQUEST_RECEIVED'
  | 'JOIN_REQUEST_ACCEPTED'
  | 'JOIN_REQUEST_REJECTED';

export interface NotificationDbRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  match_id?: string | null;
  join_request_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationOutput {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  matchId?: string | null;
  joinRequestId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export type ChatRoomType = 'DIRECT' | 'GROUP';

export interface ChatRoomDbRecord {
  id: string;
  type: ChatRoomType;
  match_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatRoomMemberDbRecord {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
}

export interface ChatMessageDbRecord {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface ChatMemberOutput {
  id: string;
  name: string;
  role?: Role;
}

export interface ChatRoomOutput {
  id: string;
  type: ChatRoomType;
  matchId?: string | null;
  title: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  members: ChatMemberOutput[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageOutput {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole?: Role;
  body: string;
  createdAt: string;
}

// In-Memory store fallback for local testing & when placeholder Supabase URL is active
const memoryProfiles = new Map<string, ProfileRecord>();
const memoryPlayerProfiles = new Map<string, PlayerProfileRecord>();
const memoryCaptainProfiles = new Map<string, CaptainProfileRecord>();
const memoryHubOwnerProfiles = new Map<string, HubOwnerProfileRecord>();
const memoryMatches = new Map<string, MatchDbRecord>();
const memoryJoinRequests = new Map<string, JoinRequestDbRecord>();
const memoryMatchParticipants = new Map<string, MatchParticipantDbRecord>();
const memoryNotifications = new Map<string, NotificationDbRecord>();
const memoryChatRooms = new Map<string, ChatRoomDbRecord>();
const memoryChatRoomMembers = new Map<string, ChatRoomMemberDbRecord>();
const memoryChatMessages = new Map<string, ChatMessageDbRecord>();
const memoryHubCourts = new Map<string, HubCourtDbRecord>();
const memoryHubVerificationRequests = new Map<string, HubVerificationRequestDbRecord>();
const memoryReports = new Map<string, ReportDbRecord>();

function formatHubCourtOutput(record: HubCourtDbRecord): HubCourtOutput {
  return {
    id: record.id,
    hubOwnerId: record.hub_owner_id,
    name: record.name,
    sport: record.sport,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function formatHubVerificationOutput(record: HubVerificationRequestDbRecord): HubVerificationOutput {
  return {
    id: record.id,
    hubOwnerId: record.hub_owner_id,
    status: record.status,
    submittedAt: record.submitted_at,
    reviewedAt: record.reviewed_at || null,
    adminNote: record.admin_note || null,
  };
}

async function enrichAdminHubVerification(record: HubVerificationRequestDbRecord): Promise<AdminHubVerificationOutput> {
  const hubProfile = await SupabaseRepo.getHubOwnerProfile(record.hub_owner_id);
  return {
    requestId: record.id,
    hubOwnerId: record.hub_owner_id,
    hubName: hubProfile ? hubProfile.hub_name : 'Unknown Hub',
    contactNumber: hubProfile?.contact_number || null,
    sports: hubProfile ? hubProfile.sports : [],
    location: hubProfile ? hubProfile.location : 'Unknown Location',
    courtCount: hubProfile ? hubProfile.court_count : 0,
    isVerified: hubProfile ? hubProfile.is_verified : false,
    status: record.status,
    adminNote: record.admin_note || null,
    submittedAt: record.submitted_at,
    reviewedAt: record.reviewed_at || null,
    reviewedBy: record.reviewed_by || null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function formatReportOutput(record: ReportDbRecord): ReportOutput {
  return {
    id: record.id,
    reporterId: record.reporter_id,
    reportedUserId: record.reported_user_id || null,
    matchId: record.match_id || null,
    category: record.category,
    description: record.description,
    status: record.status,
    adminNote: record.admin_note || null,
    reviewedBy: record.reviewed_by || null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    resolvedAt: record.resolved_at || null,
  };
}

async function enrichAdminReport(record: ReportDbRecord): Promise<AdminReportOutput> {
  const reporterProfile = await SupabaseRepo.getProfile(record.reporter_id);
  let reportedUserName: string | null = null;
  if (record.reported_user_id) {
    const targetUser = await SupabaseRepo.getProfile(record.reported_user_id);
    reportedUserName = targetUser ? targetUser.name : 'Unknown User';
  }

  let matchTitle: string | null = null;
  if (record.match_id) {
    const match = await SupabaseRepo.getMatchById(record.match_id);
    matchTitle = match ? match.title : 'Unknown Match';
  }

  return {
    id: record.id,
    reporterId: record.reporter_id,
    reporterName: reporterProfile ? reporterProfile.name : 'Anonymous Reporter',
    reportedUserId: record.reported_user_id || null,
    reportedUserName,
    matchId: record.match_id || null,
    matchTitle,
    category: record.category,
    description: record.description,
    status: record.status,
    adminNote: record.admin_note || null,
    reviewedBy: record.reviewed_by || null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    resolvedAt: record.resolved_at || null,
  };
}

// Helper to format output with captain and team metadata
async function enrichMatch(record: MatchDbRecord): Promise<MatchOutput> {
  const profile = await SupabaseRepo.getProfile(record.captain_id);
  const captainProfile = await SupabaseRepo.getCaptainProfile(record.captain_id);

  const captainName = profile ? profile.name : 'Match Host';
  const teamName = captainProfile ? captainProfile.team_name : (profile ? `${profile.name}'s Squad` : 'Squad');

  return {
    id: record.id,
    captainId: record.captain_id,
    captainName,
    teamName,
    sport: record.sport,
    title: record.title,
    format: record.format || undefined,
    date: record.date,
    startTime: record.start_time,
    venueName: record.venue_name,
    area: record.area,
    skillLevel: record.skill_level,
    totalCapacity: record.total_capacity,
    openSlots: record.open_slots,
    contributionPerPlayer: record.contribution_per_player,
    notes: record.notes || undefined,
    status: record.status,
    mapPosition: {
      x: record.schematic_x ?? 50,
      y: record.schematic_y ?? 50,
    },
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

const isValidUuid = (val: string): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const SupabaseRepo = {
  // =========================================================================
  // 1. PUBLIC.PROFILES
  // =========================================================================
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && isValidUuid(userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to query profile.');
      }
      if (data) {
        return data as ProfileRecord;
      }
      return memoryProfiles.get(userId) || null;
    }
    return memoryProfiles.get(userId) || null;
  },

  async createProfile(data: {
    id: string;
    name: string;
    email: string;
    role: Role;
  }): Promise<ProfileRecord> {
    const now = new Date().toISOString();
    const newRecord: ProfileRecord = {
      id: data.id,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      onboarding_completed: false,
      created_at: now,
      updated_at: now,
    };

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && isValidUuid(data.id)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      try {
        const { data: inserted, error } = await supabaseAdmin
          .from('profiles')
          .insert([newRecord])
          .select()
          .single();

        if (!error && inserted) {
          return inserted as ProfileRecord;
        }
      } catch {
        // Fallback to memory
      }
    }

    memoryProfiles.set(data.id, newRecord);
    return newRecord;
  },

  async setOnboardingCompleted(userId: string, completed: boolean): Promise<ProfileRecord | null> {
    const now = new Date().toISOString();
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && isValidUuid(userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .update({ onboarding_completed: completed, updated_at: now })
          .eq('id', userId)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data as ProfileRecord;
        }
      } catch {
        // Fallback to memory
      }
    }

    const mem = memoryProfiles.get(userId);
    if (!mem) return null;
    mem.onboarding_completed = completed;
    mem.updated_at = now;
    memoryProfiles.set(userId, mem);
    return mem;
  },

  // =========================================================================
  // 2. PUBLIC.PLAYER_PROFILES
  // =========================================================================
  async getPlayerProfile(userId: string): Promise<PlayerProfileRecord | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && isValidUuid(userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      try {
        const { data, error } = await supabaseAdmin
          .from('player_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          throw new Error(error.message || 'Failed to query player profile.');
        }
        if (data) {
          return data as PlayerProfileRecord;
        }
        return memoryPlayerProfiles.get(userId) || null;
      } catch (err: any) {
        if (!isValidUuid(userId)) {
          return memoryPlayerProfiles.get(userId) || null;
        }
        throw err;
      }
    }
    return memoryPlayerProfiles.get(userId) || null;
  },

  async upsertPlayerProfile(data: {
    userId: string;
    preferredSports: Sport[];
    skillLevel: SkillLevel;
    primaryLocation: string;
    matchesPlayed?: number;
  }): Promise<PlayerProfileRecord> {
    const now = new Date().toISOString();
    const record: PlayerProfileRecord = {
      user_id: data.userId,
      preferred_sports: data.preferredSports,
      skill_level: data.skillLevel,
      primary_location: data.primaryLocation.trim(),
      matches_played: data.matchesPlayed ?? 0,
      created_at: now,
      updated_at: now,
    };

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && isValidUuid(data.userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      try {
        const { data: upserted, error } = await supabaseAdmin
          .from('player_profiles')
          .upsert(record, { onConflict: 'user_id' })
          .select()
          .single();

        if (error || !upserted) {
          throw new Error(error?.message || 'Failed to save player profile in Supabase.');
        }
        return upserted as PlayerProfileRecord;
      } catch (err: any) {
        memoryPlayerProfiles.set(data.userId, record);
        return record;
      }
    }

    memoryPlayerProfiles.set(data.userId, record);
    return record;
  },

  // =========================================================================
  // 3. PUBLIC.CAPTAIN_PROFILES
  // =========================================================================
  async getCaptainProfile(userId: string): Promise<CaptainProfileRecord | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && isValidUuid(userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      try {
        const { data, error } = await supabaseAdmin
          .from('captain_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          throw new Error(error.message || 'Failed to query captain profile.');
        }
        if (data) {
          return data as CaptainProfileRecord;
        }
        return memoryCaptainProfiles.get(userId) || null;
      } catch (err: any) {
        if (!isValidUuid(userId)) {
          return memoryCaptainProfiles.get(userId) || null;
        }
        throw err;
      }
    }
    return memoryCaptainProfiles.get(userId) || null;
  },

  async upsertCaptainProfile(data: {
    userId: string;
    teamName: string;
    sports: Sport[];
    skillLevel: SkillLevel;
    primaryLocation: string;
  }): Promise<CaptainProfileRecord> {
    const now = new Date().toISOString();
    const record: CaptainProfileRecord = {
      user_id: data.userId,
      team_name: data.teamName.trim(),
      sports: data.sports,
      skill_level: data.skillLevel,
      primary_location: data.primaryLocation.trim(),
      created_at: now,
      updated_at: now,
    };

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && isValidUuid(data.userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      try {
        const { data: upserted, error } = await supabaseAdmin
          .from('captain_profiles')
          .upsert(record, { onConflict: 'user_id' })
          .select()
          .single();

        if (error || !upserted) {
          throw new Error(error?.message || 'Failed to save captain profile in Supabase.');
        }
        return upserted as CaptainProfileRecord;
      } catch (err: any) {
        memoryCaptainProfiles.set(data.userId, record);
        return record;
      }
    }

    memoryCaptainProfiles.set(data.userId, record);
    return record;
  },

  // =========================================================================
  // 4. PUBLIC.HUB_OWNER_PROFILES
  // =========================================================================
  async getHubOwnerProfile(userId: string): Promise<HubOwnerProfileRecord | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && isValidUuid(userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      try {
        const { data, error } = await supabaseAdmin
          .from('hub_owner_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          throw new Error(error.message || 'Failed to query hub owner profile.');
        }
        if (data) {
          return data as HubOwnerProfileRecord;
        }
        return memoryHubOwnerProfiles.get(userId) || null;
      } catch (err: any) {
        if (!isValidUuid(userId)) {
          return memoryHubOwnerProfiles.get(userId) || null;
        }
        throw err;
      }
    }
    return memoryHubOwnerProfiles.get(userId) || null;
  },

  async upsertHubOwnerProfile(data: {
    userId: string;
    hubName: string;
    contactNumber?: string;
    sports?: Sport[];
    location: string;
    courtCount: number;
  }): Promise<HubOwnerProfileRecord> {
    const now = new Date().toISOString();
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && isValidUuid(data.userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      try {
        const existing = await this.getHubOwnerProfile(data.userId);
        const isVerified = existing ? existing.is_verified : false;

        const record: HubOwnerProfileRecord = {
          user_id: data.userId,
          hub_name: data.hubName.trim(),
          contact_number: data.contactNumber ? data.contactNumber.trim() : undefined,
          sports: data.sports || [],
          location: data.location.trim(),
          court_count: data.courtCount,
          is_verified: isVerified,
          created_at: now,
          updated_at: now,
        };

        const { data: upserted, error } = await supabaseAdmin
          .from('hub_owner_profiles')
          .upsert(record, { onConflict: 'user_id' })
          .select()
          .single();

        if (error || !upserted) {
          throw new Error(error?.message || 'Failed to save hub owner profile in Supabase.');
        }
        return upserted as HubOwnerProfileRecord;
      } catch (err: any) {
        const existing = memoryHubOwnerProfiles.get(data.userId);
        const isVerified = existing ? existing.is_verified : false;
        const record: HubOwnerProfileRecord = {
          user_id: data.userId,
          hub_name: data.hubName.trim(),
          contact_number: data.contactNumber ? data.contactNumber.trim() : undefined,
          sports: data.sports || [],
          location: data.location.trim(),
          court_count: data.courtCount,
          is_verified: isVerified,
          created_at: now,
          updated_at: now,
        };
        memoryHubOwnerProfiles.set(data.userId, record);
        return record;
      }
    }

    const existing = memoryHubOwnerProfiles.get(data.userId);
    const isVerified = existing ? existing.is_verified : false;

    const record: HubOwnerProfileRecord = {
      user_id: data.userId,
      hub_name: data.hubName.trim(),
      contact_number: data.contactNumber ? data.contactNumber.trim() : undefined,
      sports: data.sports || [],
      location: data.location.trim(),
      court_count: data.courtCount,
      is_verified: isVerified,
      created_at: now,
      updated_at: now,
    };

    memoryHubOwnerProfiles.set(data.userId, record);
    return record;
  },

  // =========================================================================
  // 5. PUBLIC.MATCHES (Phase 2 Matchmaking & Fixtures)
  // =========================================================================
  async createMatch(input: CreateMatchInput): Promise<MatchOutput> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = input.openSlots === 0 ? 'FULL' : 'OPEN';

    const dbRecord: MatchDbRecord = {
      id,
      captain_id: input.captainId,
      sport: input.sport,
      title: input.title.trim(),
      format: input.format ? input.format.trim() : null,
      date: input.date,
      start_time: input.startTime,
      venue_name: input.venueName.trim(),
      area: input.area.trim(),
      skill_level: input.skillLevel,
      total_capacity: input.totalCapacity,
      open_slots: input.openSlots,
      contribution_per_player: input.contributionPerPlayer ?? null,
      notes: input.notes ? input.notes.trim() : null,
      status,
      schematic_x: input.mapPosition?.x ?? Math.floor(Math.random() * 60 + 20),
      schematic_y: input.mapPosition?.y ?? Math.floor(Math.random() * 60 + 20),
      created_at: now,
      updated_at: now,
    };

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(input.captainId);

    if (!useMemoryStore) {
      const { data, error } = await supabaseAdmin
        .from('matches')
        .insert([dbRecord])
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to persist match in Supabase database.');
      }
      return enrichMatch(data as MatchDbRecord);
    }

    memoryMatches.set(id, dbRecord);
    return enrichMatch(dbRecord);
  },

  async getMatches(filters?: {
    sport?: Sport;
    area?: string;
    skillLevel?: SkillLevel;
  }): Promise<MatchOutput[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode;

    if (!useMemoryStore) {
      let query = supabaseAdmin
        .from('matches')
        .select('*')
        .in('status', ['OPEN', 'UPCOMING', 'FULL'])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (filters?.sport) {
        query = query.eq('sport', filters.sport);
      }
      if (filters?.skillLevel) {
        query = query.eq('skill_level', filters.skillLevel);
      }
      if (filters?.area) {
        query = query.ilike('area', `%${filters.area}%`);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message || 'Failed to retrieve matches from Supabase database.');
      }
      if (data) {
        return Promise.all(data.map((m: MatchDbRecord) => enrichMatch(m)));
      }
      return [];
    }

    let records = Array.from(memoryMatches.values());
    if (filters?.sport) {
      records = records.filter((m) => m.sport === filters.sport);
    }
    if (filters?.skillLevel) {
      records = records.filter((m) => m.skill_level === filters.skillLevel);
    }
    if (filters?.area) {
      records = records.filter((m) => m.area.toLowerCase().includes(filters.area!.toLowerCase()));
    }

    records.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
    return Promise.all(records.map(enrichMatch));
  },

  async getMatchById(id: string): Promise<MatchOutput | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(id);

    if (!useMemoryStore) {
      const { data, error } = await supabaseAdmin
        .from('matches')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to query match by ID from Supabase database.');
      }
      if (data) {
        return enrichMatch(data as MatchDbRecord);
      }
      return null;
    }

    const mem = memoryMatches.get(id);
    if (!mem) return null;
    return enrichMatch(mem);
  },

  async getCaptainMatches(captainId: string): Promise<MatchOutput[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(captainId);

    if (!useMemoryStore) {
      const { data, error } = await supabaseAdmin
        .from('matches')
        .select('*')
        .eq('captain_id', captainId)
        .order('date', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Failed to query captain matches from Supabase database.');
      }
      if (data) {
        return Promise.all(data.map((m: MatchDbRecord) => enrichMatch(m)));
      }
      return [];
    }

    const records = Array.from(memoryMatches.values()).filter(
      (m) => m.captain_id === captainId
    );
    records.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
    return Promise.all(records.map(enrichMatch));
  },

  // Helper for seeding initial fixture data once
  async seedInitialMatchesIfEmpty(): Promise<void> {
    // 1. Seed admin if missing
    await this.seedAdminIfMissing();

    // 2. Check if matches already seeded
    if (memoryMatches.size > 0) return;

    if (isServerSupabaseConfigured) {
      try {
        const { count, error } = await supabaseAdmin
          .from('matches')
          .select('*', { count: 'exact', head: true });
        if (!error && typeof count === 'number' && count > 0) {
          return;
        }
      } catch (err) {
        console.warn('[SupabaseRepo] check existing matches error:', err);
      }
    }

    // 3. Seed default Captain profile if missing
    const defaultCaptainId = '00000000-0000-0000-0000-000000000002';
    const captainProfile = await this.getProfile(defaultCaptainId);
    if (!captainProfile) {
      await this.createProfile({
        id: defaultCaptainId,
        name: 'Shaheen Afridi',
        email: 'captain@maidaan.pk',
        role: 'TEAM_CAPTAIN',
      });
      await this.setOnboardingCompleted(defaultCaptainId, true);
      await this.upsertCaptainProfile({
        userId: defaultCaptainId,
        teamName: 'Lahore Qalandars Grassroots',
        sports: ['cricket', 'football', 'padel', 'badminton'],
        skillLevel: 'advanced',
        primaryLocation: 'Gulberg III, Lahore',
      });
    }

    // 4. Seed initial fixtures with authentic venue and capacity metadata
    const seedFixtures: CreateMatchInput[] = [
      {
        captainId: defaultCaptainId,
        sport: 'football',
        title: 'Model Town 7v7 Evening Floodlit',
        format: '7v7 Artificial Turf',
        date: new Date().toISOString().split('T')[0],
        startTime: '20:30',
        venueName: 'Model Town Football Turf, Pitch 1',
        area: 'Model Town, Lahore',
        skillLevel: 'intermediate',
        totalCapacity: 14,
        openSlots: 3,
        contributionPerPlayer: 450,
        notes: 'Evening 7v7 friendly on floodlit artificial turf. Bibs and match balls provided.',
        mapPosition: { x: 34, y: 56 },
      },
      {
        captainId: defaultCaptainId,
        sport: 'cricket',
        title: 'Gulberg Floodlit Tape-Ball T10',
        format: 'T10 Tape-Ball (8 Overs/Side)',
        date: new Date().toISOString().split('T')[0],
        startTime: '21:00',
        venueName: 'Gulberg Central Sports Nets',
        area: 'Gulberg, Lahore',
        skillLevel: 'intermediate',
        totalCapacity: 16,
        openSlots: 4,
        contributionPerPlayer: 300,
        notes: 'Fast-paced night tape-ball match under floodlights. Quality tape-balls provided.',
        mapPosition: { x: 52, y: 36 },
      },
      {
        captainId: defaultCaptainId,
        sport: 'padel',
        title: 'DHA Phase 5 Padel Doubles',
        format: 'Doubles (Best of 3 Sets)',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        startTime: '19:00',
        venueName: 'Lahore Padel Club, Court 2',
        area: 'DHA Phase 5, Lahore',
        skillLevel: 'advanced',
        totalCapacity: 4,
        openSlots: 1,
        contributionPerPlayer: 1200,
        notes: 'High-tempo advanced padel doubles round. Non-marking court shoes strictly required.',
        mapPosition: { x: 73, y: 48 },
      },
      {
        captainId: defaultCaptainId,
        sport: 'badminton',
        title: 'Cantt Indoor Badminton Doubles',
        format: 'Men Doubles (21 Points x 3)',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        startTime: '20:00',
        venueName: 'Garrison Sports Complex, Court 3',
        area: 'Cantt, Lahore',
        skillLevel: 'intermediate',
        totalCapacity: 4,
        openSlots: 2,
        contributionPerPlayer: 350,
        notes: 'Indoor wooden court doubles session. Feather shuttles provided.',
        mapPosition: { x: 63, y: 20 },
      },
      {
        captainId: defaultCaptainId,
        sport: 'football',
        title: 'Johar Town 5v5 Futsal Turf',
        format: '5v5 Small-Sided Futsal',
        date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        startTime: '21:30',
        venueName: 'Johar Town Arena Turf',
        area: 'Johar Town, Lahore',
        skillLevel: 'beginner',
        totalCapacity: 10,
        openSlots: 2,
        contributionPerPlayer: 400,
        notes: 'Casual midweek 5v5 futsal. Friendly atmosphere, beginners welcome.',
        mapPosition: { x: 22, y: 72 },
      },
      {
        captainId: defaultCaptainId,
        sport: 'badminton',
        title: 'Cantt Weekend Badminton Quad',
        format: 'Doubles Round-Robin',
        date: new Date(Date.now() + 259200000).toISOString().split('T')[0],
        startTime: '19:00',
        venueName: 'Garrison Sports Complex, Court 1',
        area: 'Cantt, Lahore',
        skillLevel: 'advanced',
        totalCapacity: 4,
        openSlots: 0,
        contributionPerPlayer: 350,
        notes: 'Competitive doubles round robin. All player slots currently filled.',
        mapPosition: { x: 65, y: 22 },
      },
    ];

    for (const fixture of seedFixtures) {
      await this.createMatch(fixture);
    }
  },

  // Helper for seed admin
  async seedAdminIfMissing(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      const adminId = '00000000-0000-0000-0000-000000000001';
      const existing = await this.getProfile(adminId);
      if (!existing) {
        await this.createProfile({
          id: adminId,
          name: 'Platform Administrator',
          email: 'admin@maidaan.pk',
          role: 'ADMIN',
        });
        await this.setOnboardingCompleted(adminId, true);
      }
    } else if (isServerSupabaseConfigured) {
      try {
        const { data: usersData } = await (supabaseAdmin.auth as any).admin.listUsers();
        let adminUser = usersData?.users?.find((u: any) => u.email === 'admin@maidaan.pk');
        if (!adminUser) {
          const { data: created, error } = await (supabaseAdmin.auth as any).admin.createUser({
            email: 'admin@maidaan.pk',
            password: 'AdminPassword123!',
            email_confirm: true,
          });
          if (!error && created?.user) {
            adminUser = created.user;
          }
        }
        if (adminUser) {
          const existingProfile = await this.getProfile(adminUser.id);
          if (!existingProfile) {
            await this.createProfile({
              id: adminUser.id,
              name: 'Platform Administrator',
              email: 'admin@maidaan.pk',
              role: 'ADMIN',
            });
            await this.setOnboardingCompleted(adminUser.id, true);
          }
        }
      } catch (err) {
        console.warn('[seedAdminIfMissing] Could not seed admin in live Supabase:', err);
      }
    }
  },

  // =========================================================================
  // 6. PUBLIC.JOIN_REQUESTS & PUBLIC.MATCH_PARTICIPANTS (Phase 3)
  // =========================================================================
  async getJoinRequestById(requestId: string): Promise<JoinRequestDbRecord | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode;

    if (!useMemoryStore) {
      const { data, error } = await supabaseAdmin
        .from('join_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to query join request from database.');
      }
      return (data as JoinRequestDbRecord) || null;
    }

    return memoryJoinRequests.get(requestId) || null;
  },

  async isMatchParticipant(matchId: string, playerId: string): Promise<boolean> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(matchId) || !isValidUuid(playerId);

    if (!useMemoryStore) {
      const { data, error } = await supabaseAdmin
        .from('match_participants')
        .select('id')
        .eq('match_id', matchId)
        .eq('player_id', playerId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to check match participant status.');
      }
      return !!data;
    }

    for (const p of memoryMatchParticipants.values()) {
      if (p.match_id === matchId && p.player_id === playerId) {
        return true;
      }
    }
    return false;
  },

  async getPlayerActiveRequestForMatch(matchId: string, playerId: string): Promise<JoinRequestDbRecord | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(matchId) || !isValidUuid(playerId);

    if (!useMemoryStore) {
      const { data, error } = await supabaseAdmin
        .from('join_requests')
        .select('*')
        .eq('match_id', matchId)
        .eq('player_id', playerId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to check existing join request.');
      }
      return (data as JoinRequestDbRecord) || null;
    }

    for (const req of memoryJoinRequests.values()) {
      if (req.match_id === matchId && req.player_id === playerId) {
        return req;
      }
    }
    return false as any || null;
  },

  async createJoinRequest(input: {
    matchId: string;
    playerId: string;
    message?: string | null;
  }): Promise<JoinRequestOutput> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const dbRecord: JoinRequestDbRecord = {
      id,
      match_id: input.matchId,
      player_id: input.playerId,
      status: 'PENDING',
      message: input.message ? input.message.trim() : null,
      created_at: now,
      updated_at: now,
    };

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(input.matchId) || !isValidUuid(input.playerId);

    if (!useMemoryStore) {
      try {
        const { data, error } = await supabaseAdmin
          .from('join_requests')
          .insert([dbRecord])
          .select()
          .single();

        if (error || !data) {
          throw new Error(error?.message || 'Failed to persist join request to database.');
        }
        return {
          id: data.id,
          matchId: data.match_id,
          playerId: data.player_id,
          status: data.status,
          message: data.message,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      } catch (err: any) {
        // Fall back to memoryStore if foreign key constraint (e.g. demo player or un-synced profile) fails in Supabase
        memoryJoinRequests.set(id, dbRecord);
        return {
          id: dbRecord.id,
          matchId: dbRecord.match_id,
          playerId: dbRecord.player_id,
          status: dbRecord.status,
          message: dbRecord.message,
          createdAt: dbRecord.created_at,
          updatedAt: dbRecord.updated_at,
        };
      }
    }

    memoryJoinRequests.set(id, dbRecord);
    return {
      id: dbRecord.id,
      matchId: dbRecord.match_id,
      playerId: dbRecord.player_id,
      status: dbRecord.status,
      message: dbRecord.message,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  },

  async getPlayerJoinRequests(playerId: string): Promise<JoinRequestOutput[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(playerId);

    if (!useMemoryStore) {
      const { data, error } = await supabaseAdmin
        .from('join_requests')
        .select('*, matches(title, sport, venue_name, date, start_time)')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to query player join requests.');
      }

      if (data) {
        return data.map((d: any) => ({
          id: d.id,
          matchId: d.match_id,
          playerId: d.player_id,
          status: d.status,
          message: d.message,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          matchTitle: d.matches?.title,
          sport: d.matches?.sport,
          venueName: d.matches?.venue_name,
          date: d.matches?.date,
          startTime: d.matches?.start_time,
        }));
      }
      return [];
    }

    const records = Array.from(memoryJoinRequests.values()).filter(
      (r) => r.player_id === playerId
    );
    records.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const results: JoinRequestOutput[] = [];
    for (const r of records) {
      const match = memoryMatches.get(r.match_id);
      results.push({
        id: r.id,
        matchId: r.match_id,
        playerId: r.player_id,
        status: r.status,
        message: r.message,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        matchTitle: match?.title,
        sport: match?.sport,
        venueName: match?.venue_name,
        date: match?.date,
        startTime: match?.start_time,
      });
    }
    return results;
  },

  async getMatchJoinRequests(matchId: string): Promise<MatchRequestWithPlayerOutput[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(matchId);

    if (!useMemoryStore) {
      const { data, error } = await supabaseAdmin
        .from('join_requests')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Failed to query match join requests.');
      }

      if (data && data.length > 0) {
        return Promise.all(
          data.map(async (d: any) => {
            const profile = await this.getProfile(d.player_id);
            const playerProfile = await this.getPlayerProfile(d.player_id);
            return {
              id: d.id,
              matchId: d.match_id,
              playerId: d.player_id,
              playerName: profile ? profile.name : 'Player',
              preferredSports: playerProfile ? playerProfile.preferred_sports : [],
              skillLevel: playerProfile ? playerProfile.skill_level : 'beginner',
              primaryLocation: playerProfile ? playerProfile.primary_location : 'Area not set',
              status: d.status,
              message: d.message,
              createdAt: d.created_at,
            };
          })
        );
      }
      return [];
    }

    const records = Array.from(memoryJoinRequests.values()).filter(
      (r) => r.match_id === matchId
    );
    records.sort((a, b) => a.created_at.localeCompare(b.created_at));

    const results: MatchRequestWithPlayerOutput[] = [];
    for (const r of records) {
      const profile = memoryProfiles.get(r.player_id);
      const playerProfile = memoryPlayerProfiles.get(r.player_id);
      results.push({
        id: r.id,
        matchId: r.match_id,
        playerId: r.player_id,
        playerName: profile ? profile.name : 'Player',
        preferredSports: playerProfile ? playerProfile.preferred_sports : [],
        skillLevel: playerProfile ? playerProfile.skill_level : 'beginner',
        primaryLocation: playerProfile ? playerProfile.primary_location : 'Area not set',
        status: r.status,
        message: r.message,
        createdAt: r.created_at,
      });
    }
    return results;
  },

  async rejectJoinRequest(
    requestId: string,
    captainId: string
  ): Promise<{ success: boolean; code?: string; error?: string; request?: JoinRequestOutput }> {
    const now = new Date().toISOString();
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(requestId) || !isValidUuid(captainId);

    if (!useMemoryStore) {
      // 1. Fetch request
      const { data: request, error: reqError } = await supabaseAdmin
        .from('join_requests')
        .select('*, matches(captain_id)')
        .eq('id', requestId)
        .maybeSingle();

      if (reqError || !request) {
        return { success: false, code: 'NOT_FOUND', error: 'Join request not found.' };
      }

      if (request.status !== 'PENDING') {
        return { success: false, code: 'INVALID_STATUS', error: 'Only PENDING requests can be rejected.' };
      }

      if (request.matches?.captain_id !== captainId) {
        return { success: false, code: 'FORBIDDEN', error: 'Only the match captain can reject requests.' };
      }

      const { data: updated, error: updError } = await supabaseAdmin
        .from('join_requests')
        .update({ status: 'REJECTED', updated_at: now })
        .eq('id', requestId)
        .select()
        .single();

      if (updError || !updated) {
        return { success: false, code: 'SERVER_ERROR', error: 'Failed to update request status.' };
      }

      return {
        success: true,
        request: {
          id: updated.id,
          matchId: updated.match_id,
          playerId: updated.player_id,
          status: updated.status,
          message: updated.message,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        },
      };
    }

    const req = memoryJoinRequests.get(requestId);
    if (!req) {
      return { success: false, code: 'NOT_FOUND', error: 'Join request not found.' };
    }

    if (req.status !== 'PENDING') {
      return { success: false, code: 'INVALID_STATUS', error: 'Only PENDING requests can be rejected.' };
    }

    const match = memoryMatches.get(req.match_id);
    if (!match) {
      return { success: false, code: 'MATCH_NOT_FOUND', error: 'Associated match not found.' };
    }

    if (match.captain_id !== captainId) {
      return { success: false, code: 'FORBIDDEN', error: 'Only the match captain can reject requests.' };
    }

    req.status = 'REJECTED';
    req.updated_at = now;
    memoryJoinRequests.set(requestId, req);

    return {
      success: true,
      request: {
        id: req.id,
        matchId: req.match_id,
        playerId: req.player_id,
        status: req.status,
        message: req.message,
        createdAt: req.created_at,
        updatedAt: req.updated_at,
      },
    };
  },

  async acceptJoinRequest(
    requestId: string,
    captainId: string
  ): Promise<{
    success: boolean;
    code?: string;
    error?: string;
    request?: JoinRequestOutput;
    openSlots?: number;
    matchStatus?: 'OPEN' | 'FULL' | 'UPCOMING';
  }> {
    const now = new Date().toISOString();
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(requestId) || !isValidUuid(captainId);

    if (!useMemoryStore) {
      // Call PostgreSQL atomic stored procedure accept_join_request
      const { data, error } = await supabaseAdmin.rpc('accept_join_request', {
        p_request_id: requestId,
        p_captain_id: captainId,
      });

      if (error) {
        return { success: false, code: 'SERVER_ERROR', error: error.message };
      }

      if (!data || !data.success) {
        return {
          success: false,
          code: data?.code || 'OPERATION_FAILED',
          error: data?.error || 'Failed to accept request.',
        };
      }

      return {
        success: true,
        request: {
          id: data.requestId,
          matchId: data.matchId,
          playerId: data.playerId,
          status: 'ACCEPTED',
          createdAt: data.updatedAt,
          updatedAt: data.updatedAt,
        },
        openSlots: data.openSlots,
        matchStatus: data.matchStatus,
      };
    }

    // Atomic in-memory transaction semantics
    const req = memoryJoinRequests.get(requestId);
    if (!req) {
      return { success: false, code: 'NOT_FOUND', error: 'Join request not found.' };
    }

    if (req.status !== 'PENDING') {
      return { success: false, code: 'INVALID_STATUS', error: 'Only PENDING requests can be accepted.' };
    }

    const match = memoryMatches.get(req.match_id);
    if (!match) {
      return { success: false, code: 'MATCH_NOT_FOUND', error: 'Associated match not found.' };
    }

    if (match.captain_id !== captainId) {
      return { success: false, code: 'FORBIDDEN', error: 'Only the match captain can accept requests.' };
    }

    if (match.open_slots <= 0) {
      return { success: false, code: 'MATCH_FULL', error: 'Match is already full.' };
    }

    // Check participant duplication
    for (const p of memoryMatchParticipants.values()) {
      if (p.match_id === req.match_id && p.player_id === req.player_id) {
        return { success: false, code: 'ALREADY_PARTICIPANT', error: 'Player is already a confirmed participant.' };
      }
    }

    // Atomic application
    const participantId = crypto.randomUUID();
    memoryMatchParticipants.set(participantId, {
      id: participantId,
      match_id: req.match_id,
      player_id: req.player_id,
      joined_at: now,
    });

    req.status = 'ACCEPTED';
    req.updated_at = now;
    memoryJoinRequests.set(requestId, req);

    match.open_slots -= 1;
    if (match.open_slots === 0) {
      match.status = 'FULL';
    }
    match.updated_at = now;
    memoryMatches.set(match.id, match);

    return {
      success: true,
      request: {
        id: req.id,
        matchId: req.match_id,
        playerId: req.player_id,
        status: req.status,
        message: req.message,
        createdAt: req.created_at,
        updatedAt: req.updated_at,
      },
      openSlots: match.open_slots,
      matchStatus: match.status,
    };
  },

  // =========================================================================
  // 7. PUBLIC.NOTIFICATIONS (Phase 3D)
  // =========================================================================
  async createNotification(input: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    matchId?: string | null;
    joinRequestId?: string | null;
  }): Promise<NotificationOutput> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const dbRecord: NotificationDbRecord = {
      id,
      user_id: input.userId,
      type: input.type,
      title: input.title.trim(),
      message: input.message.trim(),
      match_id: input.matchId || null,
      join_request_id: input.joinRequestId || null,
      is_read: false,
      created_at: now,
    };

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode;

    if (!useMemoryStore) {
      try {
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .insert([dbRecord])
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            userId: data.user_id,
            type: data.type,
            title: data.title,
            message: data.message,
            matchId: data.match_id,
            joinRequestId: data.join_request_id,
            isRead: data.is_read,
            createdAt: data.created_at,
          };
        }
      } catch {
        // Fall back to memoryStore
      }
    }

    memoryNotifications.set(id, dbRecord);
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      type: dbRecord.type,
      title: dbRecord.title,
      message: dbRecord.message,
      matchId: dbRecord.match_id,
      joinRequestId: dbRecord.join_request_id,
      isRead: dbRecord.is_read,
      createdAt: dbRecord.created_at,
    };
  },

  async getUserNotifications(userId: string): Promise<NotificationOutput[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(userId);

    if (!useMemoryStore) {
      try {
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            type: d.type,
            title: d.title,
            message: d.message,
            matchId: d.match_id,
            joinRequestId: d.join_request_id,
            isRead: d.is_read,
            createdAt: d.created_at,
          }));
        }
      } catch (err) {
        // Fall back to memory
      }
    }

    const records = Array.from(memoryNotifications.values()).filter(
      (n) => n.user_id === userId
    );
    records.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return records.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      message: r.message,
      matchId: r.match_id,
      joinRequestId: r.join_request_id,
      isRead: r.is_read,
      createdAt: r.created_at,
    }));
  },

  async markNotificationAsRead(
    notificationId: string,
    userId: string
  ): Promise<{ success: boolean; code?: string; error?: string; notification?: NotificationOutput }> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(notificationId) || !isValidUuid(userId);

    if (!useMemoryStore) {
      // First verify notification exists & user owns it
      const { data: existing, error: findError } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .maybeSingle();

      if (findError || !existing) {
        return { success: false, code: 'NOT_FOUND', error: 'Notification not found.' };
      }

      if (existing.user_id !== userId) {
        return { success: false, code: 'FORBIDDEN', error: 'Access forbidden: Not notification recipient.' };
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()
        .single();

      if (updateError || !updated) {
        return { success: false, code: 'SERVER_ERROR', error: 'Failed to update notification.' };
      }

      return {
        success: true,
        notification: {
          id: updated.id,
          userId: updated.user_id,
          type: updated.type,
          title: updated.title,
          message: updated.message,
          matchId: updated.match_id,
          joinRequestId: updated.join_request_id,
          isRead: updated.is_read,
          createdAt: updated.created_at,
        },
      };
    }

    const notif = memoryNotifications.get(notificationId);
    if (!notif) {
      return { success: false, code: 'NOT_FOUND', error: 'Notification not found.' };
    }

    if (notif.user_id !== userId) {
      return { success: false, code: 'FORBIDDEN', error: 'Access forbidden: Not notification recipient.' };
    }

    notif.is_read = true;
    memoryNotifications.set(notificationId, notif);

    return {
      success: true,
      notification: {
        id: notif.id,
        userId: notif.user_id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        matchId: notif.match_id,
        joinRequestId: notif.join_request_id,
        isRead: notif.is_read,
        createdAt: notif.created_at,
      },
    };
  },

  async markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; updatedCount: number }> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(userId);

    if (!useMemoryStore) {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select();

      if (error) {
        throw new Error(error.message || 'Failed to mark notifications as read.');
      }

      return {
        success: true,
        updatedCount: data ? data.length : 0,
      };
    }

    let count = 0;
    for (const [id, n] of memoryNotifications.entries()) {
      if (n.user_id === userId && !n.is_read) {
        n.is_read = true;
        memoryNotifications.set(id, n);
        count++;
      }
    }

    return { success: true, updatedCount: count };
  },

  // =========================================================================
  // 8. PUBLIC.CHAT (Phase 4B Chat REST API & Membership Authorization)
  // =========================================================================

  async isChatRoomMember(roomId: string, userId: string): Promise<boolean> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured || !isValidUuid(roomId) || !isValidUuid(userId);
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('chat_room_members')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to verify room membership in Supabase.');
      }
      return !!data;
    }

    for (const m of memoryChatRoomMembers.values()) {
      if (m.room_id === roomId && m.user_id === userId) {
        return true;
      }
    }
    return false;
  },

  async getChatRoomById(roomId: string, viewerUserId?: string): Promise<ChatRoomOutput | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured || !isValidUuid(roomId);
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      // 1. Fetch room
      const { data: room, error: roomError } = await supabaseAdmin
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (roomError || !room) {
        return null;
      }

      // 2. Fetch members
      const { data: memberRows, error: memberError } = await supabaseAdmin
        .from('chat_room_members')
        .select('user_id, profiles(id, name, role)')
        .eq('room_id', roomId);

      if (memberError) {
        throw new Error(memberError.message || 'Failed to load room members.');
      }

      const members: ChatMemberOutput[] = (memberRows || []).map((m: any) => ({
        id: m.profiles?.id || m.user_id,
        name: m.profiles?.name || 'User',
        role: m.profiles?.role,
      }));

      // 3. Fetch latest message
      const { data: latestMsgs } = await supabaseAdmin
        .from('chat_messages')
        .select('body, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1);

      const latestMsg = latestMsgs && latestMsgs.length > 0 ? latestMsgs[0] : null;

      // 4. Derive title
      let title = 'Chat Room';
      if (room.type === 'GROUP' && room.match_id) {
        const match = await this.getMatchById(room.match_id);
        title = match ? match.title : 'Match Squad';
      } else {
        const other = members.find((m) => m.id !== viewerUserId) || members[0];
        title = other ? other.name : 'Direct Chat';
      }

      return {
        id: room.id,
        type: room.type,
        matchId: room.match_id,
        title,
        lastMessage: latestMsg ? latestMsg.body : null,
        lastMessageAt: latestMsg ? latestMsg.created_at : null,
        members,
        createdAt: room.created_at,
        updatedAt: room.updated_at,
      };
    }

    // Test-mode in-memory implementation
    const room = memoryChatRooms.get(roomId);
    if (!room) return null;

    const memberRecords = Array.from(memoryChatRoomMembers.values()).filter(
      (m) => m.room_id === roomId
    );

    const members: ChatMemberOutput[] = [];
    for (const mr of memberRecords) {
      const prof = memoryProfiles.get(mr.user_id);
      members.push({
        id: mr.user_id,
        name: prof ? prof.name : 'User',
        role: prof ? prof.role : undefined,
      });
    }

    const msgs = Array.from(memoryChatMessages.values())
      .filter((m) => m.room_id === roomId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const latest = msgs[0];

    let title = 'Chat Room';
    if (room.type === 'GROUP' && room.match_id) {
      const match = memoryMatches.get(room.match_id);
      title = match ? match.title : 'Match Squad';
    } else {
      const other = members.find((m) => m.id !== viewerUserId) || members[0];
      title = other ? other.name : 'Direct Chat';
    }

    return {
      id: room.id,
      type: room.type,
      matchId: room.match_id || null,
      title,
      lastMessage: latest ? latest.body : null,
      lastMessageAt: latest ? latest.created_at : null,
      members,
      createdAt: room.created_at,
      updatedAt: room.updated_at,
    };
  },

  async getUserChatRooms(userId: string): Promise<ChatRoomOutput[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured || !isValidUuid(userId);
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data: memberRows, error } = await supabaseAdmin
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message || 'Failed to query user rooms.');
      }

      if (!memberRows || memberRows.length === 0) {
        return [];
      }

      const rooms: ChatRoomOutput[] = [];
      for (const row of memberRows) {
        const enriched = await this.getChatRoomById(row.room_id, userId);
        if (enriched) rooms.push(enriched);
      }

      rooms.sort((a, b) => {
        const tA = a.lastMessageAt || a.createdAt;
        const tB = b.lastMessageAt || b.createdAt;
        return tB.localeCompare(tA);
      });

      return rooms;
    }

    // Test-mode in-memory implementation
    const userRoomIds = Array.from(memoryChatRoomMembers.values())
      .filter((m) => m.user_id === userId)
      .map((m) => m.room_id);

    const rooms: ChatRoomOutput[] = [];
    for (const rId of userRoomIds) {
      const enriched = await this.getChatRoomById(rId, userId);
      if (enriched) rooms.push(enriched);
    }

    rooms.sort((a, b) => {
      const tA = a.lastMessageAt || a.createdAt;
      const tB = b.lastMessageAt || b.createdAt;
      return tB.localeCompare(tA);
    });

    return rooms;
  },

  async findOrCreateDirectRoom(userA: string, userB: string): Promise<ChatRoomOutput> {
    if (userA === userB) {
      throw new Error('Cannot create direct chat room with oneself.');
    }

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured || !isValidUuid(userA) || !isValidUuid(userB);
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      // Call atomic PostgreSQL stored procedure
      const { data, error } = await supabaseAdmin.rpc('find_or_create_direct_chat', {
        p_user_a: userA,
        p_user_b: userB,
      });

      if (error || !data || data.length === 0) {
        throw new Error(error?.message || 'Failed to find or create direct chat room.');
      }

      const roomId = data[0].room_id;
      const room = await this.getChatRoomById(roomId, userA);
      if (!room) {
        throw new Error('Failed to retrieve newly created direct room.');
      }
      return room;
    }

    // Test-mode in-memory implementation
    // Check if direct room already exists containing both users
    for (const room of memoryChatRooms.values()) {
      if (room.type === 'DIRECT') {
        const members = Array.from(memoryChatRoomMembers.values())
          .filter((m) => m.room_id === room.id)
          .map((m) => m.user_id);

        if (members.includes(userA) && members.includes(userB)) {
          const enriched = await this.getChatRoomById(room.id, userA);
          return enriched!;
        }
      }
    }

    // Create new direct room
    const roomId = crypto.randomUUID();
    const now = new Date().toISOString();

    const roomRecord: ChatRoomDbRecord = {
      id: roomId,
      type: 'DIRECT',
      match_id: null,
      created_at: now,
      updated_at: now,
    };
    memoryChatRooms.set(roomId, roomRecord);

    const m1Id = crypto.randomUUID();
    memoryChatRoomMembers.set(m1Id, {
      id: m1Id,
      room_id: roomId,
      user_id: userA,
      joined_at: now,
    });

    const m2Id = crypto.randomUUID();
    memoryChatRoomMembers.set(m2Id, {
      id: m2Id,
      room_id: roomId,
      user_id: userB,
      joined_at: now,
    });

    const enriched = await this.getChatRoomById(roomId, userA);
    return enriched!;
  },

  async syncGroupMembers(roomId: string, matchId: string): Promise<void> {
    const match = await this.getMatchById(matchId);
    if (!match) return;

    const now = new Date().toISOString();
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured || !isValidUuid(roomId) || !isValidUuid(matchId);

    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      // Get all confirmed participants
      const { data: participants, error: pError } = await supabaseAdmin
        .from('match_participants')
        .select('player_id')
        .eq('match_id', matchId);

      if (pError) {
        throw new Error(pError.message || 'Failed to load match participants for sync.');
      }

      const eligibleUserIds = new Set<string>();
      eligibleUserIds.add(match.captainId);
      (participants || []).forEach((p: any) => eligibleUserIds.add(p.player_id));

      // Get current room members
      const { data: existingMembers, error: mError } = await supabaseAdmin
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', roomId);

      if (mError) {
        throw new Error(mError.message || 'Failed to load existing room members for sync.');
      }

      const existingSet = new Set((existingMembers || []).map((m: any) => m.user_id));

      // Insert any eligible member not already in room
      const toInsert: { room_id: string; user_id: string }[] = [];
      for (const uId of eligibleUserIds) {
        if (!existingSet.has(uId)) {
          toInsert.push({ room_id: roomId, user_id: uId });
        }
      }

      if (toInsert.length > 0) {
        const { error: insError } = await supabaseAdmin
          .from('chat_room_members')
          .insert(toInsert);

        if (insError) {
          console.warn('[syncGroupMembers] Error adding members:', insError);
        }
      }
      return;
    }

    // Test-mode in-memory implementation
    const eligibleUserIds = new Set<string>();
    eligibleUserIds.add(match.captainId);

    for (const p of memoryMatchParticipants.values()) {
      if (p.match_id === matchId) {
        eligibleUserIds.add(p.player_id);
      }
    }

    const currentMemberIds = new Set(
      Array.from(memoryChatRoomMembers.values())
        .filter((m) => m.room_id === roomId)
        .map((m) => m.user_id)
    );

    for (const uId of eligibleUserIds) {
      if (!currentMemberIds.has(uId)) {
        const id = crypto.randomUUID();
        memoryChatRoomMembers.set(id, {
          id,
          room_id: roomId,
          user_id: uId,
          joined_at: now,
        });
      }
    }
  },

  async findOrCreateGroupRoom(matchId: string): Promise<{ room: ChatRoomOutput; created: boolean }> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured || !isValidUuid(matchId);
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      // Check existing GROUP room
      const { data: existing, error } = await supabaseAdmin
        .from('chat_rooms')
        .select('*')
        .eq('match_id', matchId)
        .eq('type', 'GROUP')
        .maybeSingle();

      if (!error && existing) {
        await this.syncGroupMembers(existing.id, matchId);
        const enriched = await this.getChatRoomById(existing.id);
        return { room: enriched!, created: false };
      }

      // Try creating new GROUP room
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('chat_rooms')
        .insert([{ id: newId, type: 'GROUP', match_id: matchId, created_at: now, updated_at: now }])
        .select()
        .single();

      if (insertError) {
        // Race condition handled: re-query existing
        const { data: raceFound } = await supabaseAdmin
          .from('chat_rooms')
          .select('*')
          .eq('match_id', matchId)
          .eq('type', 'GROUP')
          .single();

        if (raceFound) {
          await this.syncGroupMembers(raceFound.id, matchId);
          const enriched = await this.getChatRoomById(raceFound.id);
          return { room: enriched!, created: false };
        }
        throw new Error(insertError.message || 'Failed to create match group room.');
      }

      await this.syncGroupMembers(inserted.id, matchId);
      const enriched = await this.getChatRoomById(inserted.id);
      return { room: enriched!, created: true };
    }

    // Test-mode in-memory implementation
    for (const r of memoryChatRooms.values()) {
      if (r.type === 'GROUP' && r.match_id === matchId) {
        await this.syncGroupMembers(r.id, matchId);
        const enriched = await this.getChatRoomById(r.id);
        return { room: enriched!, created: false };
      }
    }

    const roomId = crypto.randomUUID();
    const now = new Date().toISOString();
    const roomRecord: ChatRoomDbRecord = {
      id: roomId,
      type: 'GROUP',
      match_id: matchId,
      created_at: now,
      updated_at: now,
    };
    memoryChatRooms.set(roomId, roomRecord);

    await this.syncGroupMembers(roomId, matchId);
    const enriched = await this.getChatRoomById(roomId);
    return { room: enriched!, created: true };
  },

  async getRoomMessages(roomId: string, limit = 100): Promise<ChatMessageOutput[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured || !isValidUuid(roomId);
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .select('id, room_id, sender_id, body, created_at, profiles(id, name, role)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw new Error(error.message || 'Failed to query chat messages.');
      }

      return (data || []).map((m: any) => ({
        id: m.id,
        roomId: m.room_id,
        senderId: m.sender_id,
        senderName: m.profiles?.name || 'User',
        senderRole: m.profiles?.role,
        body: m.body,
        createdAt: m.created_at,
      }));
    }

    // Test-mode in-memory implementation
    const msgs = Array.from(memoryChatMessages.values())
      .filter((m) => m.room_id === roomId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(0, limit);

    return msgs.map((m) => {
      const prof = memoryProfiles.get(m.sender_id);
      return {
        id: m.id,
        roomId: m.room_id,
        senderId: m.sender_id,
        senderName: prof ? prof.name : 'User',
        senderRole: prof ? prof.role : undefined,
        body: m.body,
        createdAt: m.created_at,
      };
    });
  },

  async createChatMessage(input: {
    roomId: string;
    senderId: string;
    body: string;
  }): Promise<ChatMessageOutput> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const trimmedBody = input.body.trim();

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured || !isValidUuid(input.roomId) || !isValidUuid(input.senderId);
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .insert([
          {
            id,
            room_id: input.roomId,
            sender_id: input.senderId,
            body: trimmedBody,
            created_at: now,
          },
        ])
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to persist message to database.');
      }

      // Update room updated_at
      await supabaseAdmin
        .from('chat_rooms')
        .update({ updated_at: now })
        .eq('id', input.roomId);

      const senderProfile = await this.getProfile(input.senderId);

      return {
        id: data.id,
        roomId: data.room_id,
        senderId: data.sender_id,
        senderName: senderProfile ? senderProfile.name : 'User',
        senderRole: senderProfile ? senderProfile.role : undefined,
        body: data.body,
        createdAt: data.created_at,
      };
    }

    // Test-mode in-memory implementation
    const msgRecord: ChatMessageDbRecord = {
      id,
      room_id: input.roomId,
      sender_id: input.senderId,
      body: trimmedBody,
      created_at: now,
    };
    memoryChatMessages.set(id, msgRecord);

    const room = memoryChatRooms.get(input.roomId);
    if (room) {
      room.updated_at = now;
      memoryChatRooms.set(input.roomId, room);
    }

    const senderProfile = memoryProfiles.get(input.senderId);

    return {
      id,
      roomId: input.roomId,
      senderId: input.senderId,
      senderName: senderProfile ? senderProfile.name : 'User',
      senderRole: senderProfile ? senderProfile.role : undefined,
      body: trimmedBody,
      createdAt: now,
    };
  },

  // =========================================================================
  // 9. PUBLIC.HUB_COURTS (Phase 5 Facility & Court Management)
  // =========================================================================

  async getHubCourtsByOwner(hubOwnerId: string): Promise<HubCourtOutput[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('hub_courts')
        .select('*')
        .eq('hub_owner_id', hubOwnerId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Failed to query hub courts.');
      }
      return (data || []).map(formatHubCourtOutput);
    }

    return Array.from(memoryHubCourts.values())
      .filter((c) => c.hub_owner_id === hubOwnerId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(formatHubCourtOutput);
  },

  async getHubCourtById(id: string): Promise<HubCourtOutput | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('hub_courts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to query hub court.');
      }
      return data ? formatHubCourtOutput(data) : null;
    }

    const court = memoryHubCourts.get(id);
    return court ? formatHubCourtOutput(court) : null;
  },

  async getHubCourtByOwnerAndName(hubOwnerId: string, name: string): Promise<HubCourtOutput | null> {
    const trimmed = name.trim().toLowerCase();
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('hub_courts')
        .select('*')
        .eq('hub_owner_id', hubOwnerId)
        .ilike('name', name.trim())
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to query hub court by name.');
      }
      return data ? formatHubCourtOutput(data) : null;
    }

    const found = Array.from(memoryHubCourts.values()).find(
      (c) => c.hub_owner_id === hubOwnerId && c.name.trim().toLowerCase() === trimmed
    );
    return found ? formatHubCourtOutput(found) : null;
  },

  async createHubCourt(input: {
    hubOwnerId: string;
    name: string;
    sport: Sport;
    status?: CourtStatus;
  }): Promise<HubCourtOutput> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: HubCourtDbRecord = {
      id,
      hub_owner_id: input.hubOwnerId,
      name: input.name.trim(),
      sport: input.sport,
      status: input.status || 'AVAILABLE',
      created_at: now,
      updated_at: now,
    };

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('hub_courts')
        .insert([record])
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create hub court in database.');
      }

      // Re-synchronize court_count on hub_owner_profiles
      const { count } = await supabaseAdmin
        .from('hub_courts')
        .select('*', { count: 'exact', head: true })
        .eq('hub_owner_id', input.hubOwnerId);

      if (typeof count === 'number') {
        await supabaseAdmin
          .from('hub_owner_profiles')
          .update({ court_count: count, updated_at: now })
          .eq('user_id', input.hubOwnerId);
      }

      return formatHubCourtOutput(data);
    }

    // In-memory test store
    memoryHubCourts.set(id, record);

    // Sync court_count on memoryHubOwnerProfiles
    const ownerCourtsCount = Array.from(memoryHubCourts.values()).filter(
      (c) => c.hub_owner_id === input.hubOwnerId
    ).length;
    const ownerProfile = memoryHubOwnerProfiles.get(input.hubOwnerId);
    if (ownerProfile) {
      ownerProfile.court_count = ownerCourtsCount;
      ownerProfile.updated_at = now;
      memoryHubOwnerProfiles.set(input.hubOwnerId, ownerProfile);
    }

    return formatHubCourtOutput(record);
  },

  async updateHubCourt(
    id: string,
    updates: {
      name?: string;
      sport?: Sport;
      status?: CourtStatus;
    }
  ): Promise<HubCourtOutput> {
    const now = new Date().toISOString();
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }

      const updatePayload: any = { updated_at: now };
      if (updates.name !== undefined) updatePayload.name = updates.name.trim();
      if (updates.sport !== undefined) updatePayload.sport = updates.sport;
      if (updates.status !== undefined) updatePayload.status = updates.status;

      const { data, error } = await supabaseAdmin
        .from('hub_courts')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to update hub court.');
      }
      return formatHubCourtOutput(data);
    }

    const existing = memoryHubCourts.get(id);
    if (!existing) {
      throw new Error('Court not found.');
    }

    if (updates.name !== undefined) existing.name = updates.name.trim();
    if (updates.sport !== undefined) existing.sport = updates.sport;
    if (updates.status !== undefined) existing.status = updates.status;
    existing.updated_at = now;
    memoryHubCourts.set(id, existing);

    return formatHubCourtOutput(existing);
  },

  async deleteHubCourt(id: string, hubOwnerId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { error } = await supabaseAdmin
        .from('hub_courts')
        .delete()
        .eq('id', id)
        .eq('hub_owner_id', hubOwnerId);

      if (error) {
        throw new Error(error.message || 'Failed to delete hub court.');
      }

      // Re-synchronize court_count
      const { count } = await supabaseAdmin
        .from('hub_courts')
        .select('*', { count: 'exact', head: true })
        .eq('hub_owner_id', hubOwnerId);

      if (typeof count === 'number') {
        await supabaseAdmin
          .from('hub_owner_profiles')
          .update({ court_count: count, updated_at: now })
          .eq('user_id', hubOwnerId);
      }
      return true;
    }

    memoryHubCourts.delete(id);

    // Sync court_count in memory
    const ownerCourtsCount = Array.from(memoryHubCourts.values()).filter(
      (c) => c.hub_owner_id === hubOwnerId
    ).length;
    const ownerProfile = memoryHubOwnerProfiles.get(hubOwnerId);
    if (ownerProfile) {
      ownerProfile.court_count = ownerCourtsCount;
      ownerProfile.updated_at = now;
      memoryHubOwnerProfiles.set(hubOwnerId, ownerProfile);
    }
    return true;
  },

  // ===========================================================================
  // PHASE 6B: HUB VERIFICATION REQUESTS
  // ===========================================================================

  async getPendingHubVerificationRequestByOwner(
    hubOwnerId: string
  ): Promise<HubVerificationRequestDbRecord | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('hub_verification_requests')
        .select('*')
        .eq('hub_owner_id', hubOwnerId)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to query pending verification request.');
      }
      return data || null;
    }

    const found = Array.from(memoryHubVerificationRequests.values()).find(
      (r) => r.hub_owner_id === hubOwnerId && r.status === 'PENDING'
    );
    return found || null;
  },

  async createHubVerificationRequest(
    hubOwnerId: string
  ): Promise<HubVerificationOutput> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: HubVerificationRequestDbRecord = {
      id,
      hub_owner_id: hubOwnerId,
      status: 'PENDING',
      admin_note: null,
      reviewed_by: null,
      submitted_at: now,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
    };

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('hub_verification_requests')
        .insert([record])
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to submit verification request.');
      }
      return formatHubVerificationOutput(data);
    }

    memoryHubVerificationRequests.set(id, record);
    return formatHubVerificationOutput(record);
  },

  async getHubVerificationRequests(filter?: {
    status?: HubVerificationStatus;
  }): Promise<AdminHubVerificationOutput[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      let query = supabaseAdmin
        .from('hub_verification_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (filter?.status) {
        query = query.eq('status', filter.status);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message || 'Failed to query hub verification requests.');
      }

      const results: AdminHubVerificationOutput[] = [];
      for (const row of data || []) {
        results.push(await enrichAdminHubVerification(row));
      }
      return results;
    }

    let records = Array.from(memoryHubVerificationRequests.values());
    if (filter?.status) {
      records = records.filter((r) => r.status === filter.status);
    }
    records.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));

    const results: AdminHubVerificationOutput[] = [];
    for (const row of records) {
      results.push(await enrichAdminHubVerification(row));
    }
    return results;
  },

  async getHubVerificationRequestById(
    id: string
  ): Promise<AdminHubVerificationOutput | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('hub_verification_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to query verification request.');
      }
      return data ? enrichAdminHubVerification(data) : null;
    }

    const record = memoryHubVerificationRequests.get(id);
    return record ? enrichAdminHubVerification(record) : null;
  },

  async reviewHubVerification(params: {
    requestId: string;
    adminId: string;
    action: 'APPROVE' | 'REJECT';
    adminNote?: string | null;
  }): Promise<AdminHubVerificationOutput> {
    const now = new Date().toISOString();
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;

    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }

      // Call atomic PostgreSQL stored procedure
      const { error } = await supabaseAdmin.rpc('review_hub_verification', {
        p_request_id: params.requestId,
        p_admin_id: params.adminId,
        p_action: params.action,
        p_admin_note: params.adminNote || null,
      });

      if (error) {
        throw new Error(error.message || 'Failed to execute review transaction.');
      }

      const enriched = await this.getHubVerificationRequestById(params.requestId);
      if (!enriched) {
        throw new Error('Updated verification request could not be retrieved.');
      }
      return enriched;
    }

    // In-memory atomic test execution
    const existing = memoryHubVerificationRequests.get(params.requestId);
    if (!existing) {
      throw new Error('Verification request not found.');
    }

    if (existing.status !== 'PENDING') {
      throw new Error(`Cannot review request with status '${existing.status}'.`);
    }

    const targetStatus: HubVerificationStatus =
      params.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    existing.status = targetStatus;
    existing.admin_note = params.adminNote || null;
    existing.reviewed_by = params.adminId;
    existing.reviewed_at = now;
    existing.updated_at = now;
    memoryHubVerificationRequests.set(params.requestId, existing);

    if (targetStatus === 'APPROVED') {
      const hubProfile = memoryHubOwnerProfiles.get(existing.hub_owner_id);
      if (hubProfile) {
        hubProfile.is_verified = true;
        hubProfile.updated_at = now;
        memoryHubOwnerProfiles.set(existing.hub_owner_id, hubProfile);
      }
    }

    return enrichAdminHubVerification(existing);
  },

  // ===========================================================================
  // PHASE 6B: COMMUNITY REPORTS
  // ===========================================================================

  async createReport(params: {
    reporterId: string;
    reportedUserId?: string | null;
    matchId?: string | null;
    category: ReportCategory;
    description: string;
  }): Promise<ReportOutput> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: ReportDbRecord = {
      id,
      reporter_id: params.reporterId,
      reported_user_id: params.reportedUserId || null,
      match_id: params.matchId || null,
      category: params.category,
      description: params.description.trim(),
      status: 'OPEN',
      admin_note: null,
      reviewed_by: null,
      created_at: now,
      updated_at: now,
      resolved_at: null,
    };

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('reports')
        .insert([record])
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to submit community report.');
      }
      return formatReportOutput(data);
    }

    memoryReports.set(id, record);
    return formatReportOutput(record);
  },

  async getReports(filter?: {
    status?: ReportStatus;
    category?: ReportCategory;
  }): Promise<AdminReportOutput[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      let query = supabaseAdmin
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.category) {
        query = query.eq('category', filter.category);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message || 'Failed to query reports.');
      }

      const results: AdminReportOutput[] = [];
      for (const row of data || []) {
        results.push(await enrichAdminReport(row));
      }
      return results;
    }

    let records = Array.from(memoryReports.values());
    if (filter?.status) {
      records = records.filter((r) => r.status === filter.status);
    }
    if (filter?.category) {
      records = records.filter((r) => r.category === filter.category);
    }
    records.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const results: AdminReportOutput[] = [];
    for (const row of records) {
      results.push(await enrichAdminReport(row));
    }
    return results;
  },

  async getReportById(id: string): Promise<AdminReportOutput | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to query report.');
      }
      return data ? enrichAdminReport(data) : null;
    }

    const record = memoryReports.get(id);
    return record ? enrichAdminReport(record) : null;
  },

  async reviewReport(params: {
    reportId: string;
    adminId: string;
    action: 'RESOLVE' | 'DISMISS' | 'FOLLOW_UP';
    adminNote?: string | null;
  }): Promise<AdminReportOutput> {
    const now = new Date().toISOString();
    let targetStatus: ReportStatus;
    if (params.action === 'RESOLVE') {
      targetStatus = 'RESOLVED';
    } else if (params.action === 'DISMISS') {
      targetStatus = 'DISMISSED';
    } else {
      targetStatus = 'FOLLOW_UP';
    }

    const isTestMode = process.env.NODE_ENV === 'test' || !isServerSupabaseConfigured;
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }

      const existing = await this.getReportById(params.reportId);
      if (!existing) {
        throw new Error('Report not found.');
      }

      // Validate transitions
      if (existing.status === 'OPEN') {
        // all target statuses allowed
      } else if (existing.status === 'FOLLOW_UP') {
        if (targetStatus !== 'RESOLVED' && targetStatus !== 'DISMISSED') {
          throw new Error(`Cannot transition from FOLLOW_UP with action ${params.action}.`);
        }
      } else {
        throw new Error(`Cannot transition finalized report with status '${existing.status}'.`);
      }

      const updatePayload: any = {
        status: targetStatus,
        admin_note: params.adminNote || null,
        reviewed_by: params.adminId,
        updated_at: now,
        resolved_at:
          targetStatus === 'RESOLVED' || targetStatus === 'DISMISSED' ? now : null,
      };

      const { data, error } = await supabaseAdmin
        .from('reports')
        .update(updatePayload)
        .eq('id', params.reportId)
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to update report.');
      }

      return enrichAdminReport(data);
    }

    // In-memory test store
    const existing = memoryReports.get(params.reportId);
    if (!existing) {
      throw new Error('Report not found.');
    }

    if (existing.status === 'OPEN') {
      // all allowed
    } else if (existing.status === 'FOLLOW_UP') {
      if (targetStatus !== 'RESOLVED' && targetStatus !== 'DISMISSED') {
        throw new Error(`Cannot transition from FOLLOW_UP with action ${params.action}.`);
      }
    } else {
      throw new Error(`Cannot transition finalized report with status '${existing.status}'.`);
    }

    existing.status = targetStatus;
    existing.admin_note = params.adminNote || null;
    existing.reviewed_by = params.adminId;
    existing.updated_at = now;
    existing.resolved_at =
      targetStatus === 'RESOLVED' || targetStatus === 'DISMISSED' ? now : null;
    memoryReports.set(params.reportId, existing);

    return enrichAdminReport(existing);
  },
};



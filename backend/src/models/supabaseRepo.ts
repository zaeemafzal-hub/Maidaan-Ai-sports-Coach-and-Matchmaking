import { isUpcomingMatch } from '../utils/matchTime.js';
import crypto from 'crypto';
import { supabaseAdmin, isServerSupabaseConfigured } from '../lib/supabase.js';
import { isProduction, isTest, allowsMemoryStores } from '../config/runtime.js';

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
  account_status?: 'ACTIVE' | 'SUSPENDED';
  suspension_reason?: string | null;
  suspended_at?: string | null;
}

export interface PlayerProfileRecord {
  phone?: string;
  city_id?: string;
  area_id?: string;
  avatar_url?: string;
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
  city_id?: string;
  area_id?: string;
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
  id: string;
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

export interface HubDashboardSummaryOutput {
  hub: {
    id: string;
    name: string;
    location: string;
    contactNumber: string | null;
    sports: Sport[];
    courtCount: number;
    isVerified: boolean;
  };
  verification: {
    status: HubVerificationStatus | 'NOT_SUBMITTED';
    adminNote: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
  };
  courts: {
    total: number;
    available: number;
    limited: number;
    unavailable: number;
  };
}

export interface AdminDashboardSummaryOutput {
  users: {
    total: number;
  };
  matches: {
    total: number;
    open: number;
  };
  hubs: {
    total: number;
    verified: number;
    pendingVerification: number;
  };
  reports: {
    open: number;
  };
}

export interface AdminHubListItem {
  id: string;
  userId: string;
  hubName: string;
  ownerName: string;
  location: string;
  contactNumber: string | null;
  sports: Sport[];
  courtCount: number;
  isVerified: boolean;
  verificationStatus: HubVerificationStatus | 'NOT_SUBMITTED';
  createdAt: string;
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

export type TeamMemberRole = 'CAPTAIN' | 'PLAYER' | 'VICE_CAPTAIN';
export type TeamMemberStatus = 'ACTIVE' | 'INVITED' | 'LEFT' | 'REMOVED';

export interface TeamDbRecord {
  id: string;
  captain_id: string;
  name: string;
  sport: Sport;
  skill_level: SkillLevel;
  area: string;
  created_at: string;
  updated_at: string;
}

export interface TeamOutput {
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

export interface TeamMemberDbRecord {
  id: string;
  team_id: string;
  user_id: string;
  member_role: TeamMemberRole;
  status: TeamMemberStatus;
  joined_at: string;
}

export interface TeamMemberOutput {
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

export interface MatchDbRecord {
  id: string;
  captain_id: string;
  team_id?: string | null;
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
  teamId?: string;
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
  teamId?: string | null;
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
  client_message_id?: string | null;
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
  clientMessageId?: string;
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
const memoryUserRoles = new Map<string, Set<Role>>();
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
const memoryTeams = new Map<string, TeamDbRecord>();
const memoryTeamMembers = new Map<string, TeamMemberDbRecord>();

function formatTeamOutput(record: TeamDbRecord, memberCount?: number): TeamOutput {
  return {
    id: record.id,
    captainId: record.captain_id,
    name: record.name,
    sport: record.sport,
    skillLevel: record.skill_level,
    area: record.area,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    memberCount,
  };
}

async function formatTeamMemberOutput(record: TeamMemberDbRecord): Promise<TeamMemberOutput> {
  const profile = await SupabaseRepo.getProfile(record.user_id);
  const playerProfile = await SupabaseRepo.getPlayerProfile(record.user_id);
  return {
    id: record.id,
    teamId: record.team_id,
    userId: record.user_id,
    userName: profile ? profile.name : 'Team Player',
    userEmail: profile?.email,
    memberRole: record.member_role,
    status: record.status,
    joinedAt: record.joined_at,
    skillLevel: playerProfile?.skill_level,
    preferredSports: playerProfile?.preferred_sports,
  };
}

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
    id: record.id,
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

  let teamName = 'Squad';
  if (record.team_id) {
    const team = await SupabaseRepo.getTeamById(record.team_id);
    if (team) {
      teamName = team.name;
    }
  }
  if (teamName === 'Squad') {
    teamName = captainProfile ? captainProfile.team_name : (profile ? `${profile.name}'s Squad` : 'Squad');
  }

  const captainName = profile ? profile.name : 'Match Host';

  return {
    id: record.id,
    captainId: record.captain_id,
    captainName,
    teamId: record.team_id || undefined,
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

const isInMemoryTestMode = (): boolean => {
  return allowsMemoryStores();
};

export const SupabaseRepo = {
  async suspendedIds(): Promise<Set<string>> {
    if (allowsMemoryStores()) return new Set([...memoryProfiles.values()].filter(p => p.account_status === 'SUSPENDED').map(p => p.id));
    const {data,error} = await supabaseAdmin.from('profiles').select('id').eq('account_status','SUSPENDED');
    if (error) throw new Error(error.message);
    return new Set((data || []).map(p => p.id));
  },
  // Used only by the account-management repository in isolated tests.
  listMemoryProfiles(): ProfileRecord[] {
    if (!isTest()) throw new Error('In-memory accounts are only available in test mode.');
    return [...memoryProfiles.values()];
  },
  revokeMemoryRole(userId: string, role: Role): void {
    if (!isTest()) throw new Error('In-memory accounts are only available in test mode.');
    memoryUserRoles.get(userId)?.delete(role);
  },
  // =========================================================================
  // 1. PUBLIC.PROFILES
  // =========================================================================
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    const isTestMode = isInMemoryTestMode();
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
      return null;
    }
    if (!isTestMode) {
      return null;
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

    const isTestMode = isInMemoryTestMode();
    if (!isTestMode && isValidUuid(data.id)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data: inserted, error } = await supabaseAdmin
        .from('profiles').insert([newRecord]).select().single();
      if (error || !inserted) throw new Error(error?.message || 'Failed to save profile.');
      await this.addRole(data.id, data.role);
      if (data.role !== 'ADMIN' && data.role !== 'PLAYER') await this.addRole(data.id, 'PLAYER');
      return inserted as ProfileRecord;
    }

    if (!isTestMode) throw new Error('A valid user ID is required.');
    memoryProfiles.set(data.id, newRecord);
    await this.addRole(data.id, data.role || 'PLAYER');
    if (data.role && data.role !== 'ADMIN' && data.role !== 'PLAYER') {
      await this.addRole(data.id, 'PLAYER');
    }
    return newRecord;
  },

  // =========================================================================
  // 1B. PUBLIC.USER_ROLES (Multi-Role Capabilities)
  // =========================================================================
  async getUserRoles(userId: string): Promise<Role[]> {
    const isTestMode = isInMemoryTestMode();
    if (!isTestMode && isValidUuid(userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('user_roles').select('role').eq('user_id', userId).eq('status', 'ACTIVE');
      if (error) throw new Error(error.message || 'Failed to load account capabilities.');
      // An empty ACTIVE set means no permissions, including after revocation.
      return (data || []).map((record: { role: string }) => record.role as Role);
    }

    if (!isTestMode) return [];
    if (isTestMode) {
      // Check memory store
      const memRoles = memoryUserRoles.get(userId);
      if (memRoles) {
        return Array.from(memRoles);
      }
    }

    // Only legacy in-memory test fixtures may use profiles.role.
    const profile = await this.getProfile(userId);
    if (profile?.role) {
      if (profile.role === 'ADMIN') {
        return ['ADMIN'];
      }
      // Existing TEAM_CAPTAIN and HUB_OWNER also receive PLAYER capability
      if (profile.role === 'TEAM_CAPTAIN') {
        return ['PLAYER', 'TEAM_CAPTAIN'];
      }
      if (profile.role === 'HUB_OWNER') {
        return ['PLAYER', 'HUB_OWNER'];
      }
      return [profile.role];
    }

    return [];
  },

  async hasRole(userId: string, role: Role): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.includes(role);
  },

  async addRole(userId: string, role: Role): Promise<void> {
    const now = new Date().toISOString();
    const isTestMode = isInMemoryTestMode();
    if (!isTestMode && isValidUuid(userId)) {
      if (!isServerSupabaseConfigured) throw new Error('Supabase live configuration is required in non-test mode.');
      const { error } = await supabaseAdmin
          .from('user_roles')
          .upsert(
            [
              {
                user_id: userId,
                role,
                status: 'ACTIVE',
                created_at: now,
              },
            ],
            { onConflict: 'user_id,role' }
          );
      if (error) throw new Error(error.message || 'Failed to save account capability.');
      return;
    }

    if (!isTestMode) throw new Error('A valid user ID is required.');
    let roles = memoryUserRoles.get(userId);
    if (!roles) {
      roles = new Set<Role>();
      memoryUserRoles.set(userId, roles);
    }
    roles.add(role);
  },

  async setOnboardingCompleted(userId: string, completed: boolean): Promise<ProfileRecord | null> {
    const now = new Date().toISOString();
    const isTestMode = isInMemoryTestMode();
    if (!isTestMode && isValidUuid(userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
          .from('profiles')
          .update({ onboarding_completed: completed, updated_at: now })
          .eq('id', userId)
          .select()
          .maybeSingle();

      if (error) throw new Error(error.message || 'Failed to update onboarding status.');
      return data as ProfileRecord | null;
    }

    if (!isTestMode) throw new Error('A valid user ID is required.');
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
    const isTestMode = isInMemoryTestMode();
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
        return isTestMode ? memoryPlayerProfiles.get(userId) || null : null;
      } catch (err: any) {
        if (!isValidUuid(userId)) {
          return isTestMode ? memoryPlayerProfiles.get(userId) || null : null;
        }
        throw err;
      }
    }
    return isTestMode ? memoryPlayerProfiles.get(userId) || null : null;
  },

  async upsertPlayerProfile(data: {
    userId: string;
    preferredSports: Sport[];
    skillLevel: SkillLevel;
    primaryLocation: string;
    phone?: string;
    cityId?: string;
    areaId?: string;
    avatarUrl?: string;
    matchesPlayed?: number;
  }): Promise<PlayerProfileRecord> {
    const now = new Date().toISOString();
    const existing = memoryPlayerProfiles.get(data.userId);
    const record: PlayerProfileRecord = {
      user_id: data.userId,
      preferred_sports: data.preferredSports,
      skill_level: data.skillLevel,
      primary_location: data.primaryLocation.trim(),
      ...(data.phone !== undefined ? {phone:data.phone} : {}),
      ...(data.cityId !== undefined ? {city_id:data.cityId} : {}),
      ...(data.areaId !== undefined ? {area_id:data.areaId} : {}),
      ...(data.avatarUrl !== undefined ? {avatar_url:data.avatarUrl} : {}),
      matches_played: data.matchesPlayed ?? existing?.matches_played ?? 0,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    if (isInMemoryTestMode()) {
      memoryPlayerProfiles.set(data.userId, record);
      return record;
    }
    if (!isServerSupabaseConfigured || !isValidUuid(data.userId)) {
      throw new Error('A valid user ID and Supabase configuration are required.');
    }
    // Omit server-owned statistics unless explicitly supplied by an internal caller.
    const { created_at, matches_played, ...fields } = record;
    const payload = data.matchesPlayed === undefined ? fields : { ...fields, matches_played };
    const { data: saved, error } = await supabaseAdmin
      .from('player_profiles')
      .upsert(payload, { onConflict: 'user_id', defaultToNull: false })
      .select()
      .single();
    if (error || !saved) throw new Error(error?.message || 'Failed to save player profile.');
    return saved as PlayerProfileRecord;
  },

  // =========================================================================
  // 3. PUBLIC.CAPTAIN_PROFILES
  // =========================================================================
  async getCaptainProfile(userId: string): Promise<CaptainProfileRecord | null> {
    const isTestMode = isInMemoryTestMode();
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
        return isTestMode ? memoryCaptainProfiles.get(userId) || null : null;
      } catch (err: any) {
        if (!isValidUuid(userId)) {
          return isTestMode ? memoryCaptainProfiles.get(userId) || null : null;
        }
        throw err;
      }
    }
    return isTestMode ? memoryCaptainProfiles.get(userId) || null : null;
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
      created_at: memoryCaptainProfiles.get(data.userId)?.created_at ?? now,
      updated_at: now,
    };
    let saved = record;
    if (isInMemoryTestMode()) {
      memoryCaptainProfiles.set(data.userId, record);
    } else {
      if (!isServerSupabaseConfigured || !isValidUuid(data.userId)) {
        throw new Error('A valid user ID and Supabase configuration are required.');
      }
      const { created_at, ...payload } = record;
      const { data: upserted, error } = await supabaseAdmin
        .from('captain_profiles')
        .upsert(payload, { onConflict: 'user_id', defaultToNull: false })
        .select()
        .single();
      if (error || !upserted) throw new Error(error?.message || 'Failed to save captain profile.');
      saved = upserted as CaptainProfileRecord;
    }
    await this.addRole(data.userId, 'TEAM_CAPTAIN');
    const existingTeam = await this.getCaptainTeam(data.userId);
    const teamFields = {
      name: data.teamName.trim(),
      sport: data.sports[0] || 'cricket' as Sport,
      skillLevel: data.skillLevel,
      area: data.primaryLocation.trim(),
    };
    if (existingTeam) {
      await this.updateTeam(existingTeam.id, data.userId, teamFields);
    } else {
      try {
        await this.createTeam({ captainId: data.userId, ...teamFields });
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('already has a registered team')) throw error;
        // A simultaneous setup won the unique captain key; reuse that same owned team.
        const concurrentTeam = await this.getCaptainTeam(data.userId);
        if (!concurrentTeam) throw error;
        await this.updateTeam(concurrentTeam.id, data.userId, teamFields);
      }
    }
    return saved;
  },

  // =========================================================================
  // 4. PUBLIC.HUB_OWNER_PROFILES
  // =========================================================================
  async getHubOwnerProfile(userId: string): Promise<HubOwnerProfileRecord | null> {
    const isTestMode = isInMemoryTestMode();
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
        return isTestMode ? memoryHubOwnerProfiles.get(userId) || null : null;
      } catch (err: any) {
        if (!isValidUuid(userId)) {
          return isTestMode ? memoryHubOwnerProfiles.get(userId) || null : null;
        }
        throw err;
      }
    }
    return isTestMode ? memoryHubOwnerProfiles.get(userId) || null : null;
  },

  async upsertHubOwnerProfile(data: {
    userId: string;
    hubName: string;
    contactNumber?: string;
    sports?: Sport[];
    location: string;
    cityId?: string;
    areaId?: string;
    courtCount: number;
  }): Promise<HubOwnerProfileRecord> {
    const now = new Date().toISOString();
    const existing = memoryHubOwnerProfiles.get(data.userId);
    const record: HubOwnerProfileRecord = {
      ...(existing || {}),
      user_id: data.userId,
      hub_name: data.hubName.trim(),
      contact_number: data.contactNumber?.trim(),
      sports: data.sports || [],
      location: data.location.trim(),
      ...(data.cityId!==undefined?{city_id:data.cityId}:{}),
      ...(data.areaId!==undefined?{area_id:data.areaId}:{}),
      court_count: data.courtCount,
      is_verified: existing?.is_verified ?? false,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    let saved = record;
    if (isInMemoryTestMode()) {
      memoryHubOwnerProfiles.set(data.userId, record);
    } else {
      if (!isServerSupabaseConfigured || !isValidUuid(data.userId)) {
        throw new Error('A valid user ID and Supabase configuration are required.');
      }
      // Verification belongs to administrators; onboarding must never overwrite it.
      const { created_at, is_verified, ...payload } = record;
      const { data: upserted, error } = await supabaseAdmin
        .from('hub_owner_profiles')
        .upsert(payload, { onConflict: 'user_id', defaultToNull: false })
        .select()
        .single();
      if (error || !upserted) throw new Error(error?.message || 'Failed to save hub owner profile.');
      saved = upserted as HubOwnerProfileRecord;
    }
    await this.addRole(data.userId, 'HUB_OWNER');
    return saved;
  },

  async updateHubOwnerProfile(
    userId: string,
    updates: {
      hubName?: string;
      contactNumber?: string | null;
      sports?: Sport[];
      location?: string;
      cityId?: string;
      areaId?: string;
    }
  ): Promise<HubOwnerProfileRecord> {
    const now = new Date().toISOString();
    const isTestMode = isInMemoryTestMode();

    if (!isTestMode && isValidUuid(userId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }

      const existing = await this.getHubOwnerProfile(userId);
      if (!existing) {
        throw new Error('Hub owner profile not found.');
      }

      const updatePayload: any = { updated_at: now };
      if (updates.hubName !== undefined) updatePayload.hub_name = updates.hubName.trim();
      if (updates.contactNumber !== undefined) {
        updatePayload.contact_number = updates.contactNumber ? updates.contactNumber.trim() : null;
      }
      if (updates.sports !== undefined) updatePayload.sports = updates.sports;
      if (updates.location !== undefined) updatePayload.location = updates.location.trim();
      if (updates.cityId !== undefined) updatePayload.city_id = updates.cityId;
      if (updates.areaId !== undefined) updatePayload.area_id = updates.areaId;
      // Omitted administrator-owned fields retain their current database values.

      const { data, error } = await supabaseAdmin
        .from('hub_owner_profiles')
        .update(updatePayload)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to update hub owner profile.');
      }
      return data as HubOwnerProfileRecord;
    }

    const existing = memoryHubOwnerProfiles.get(userId);
    if (!existing) {
      throw new Error('Hub owner profile not found.');
    }

    if (updates.hubName !== undefined) existing.hub_name = updates.hubName.trim();
    if (updates.contactNumber !== undefined) {
      existing.contact_number = updates.contactNumber ? updates.contactNumber.trim() : undefined;
    }
    if (updates.sports !== undefined) existing.sports = updates.sports;
    if (updates.location !== undefined) existing.location = updates.location.trim();
    if (updates.cityId !== undefined) existing.city_id = updates.cityId;
    if (updates.areaId !== undefined) existing.area_id = updates.areaId;
    // Strictly preserve is_verified and court_count
    existing.updated_at = now;

    memoryHubOwnerProfiles.set(userId, existing);
    return existing;
  },

  async getHubs(filters?: {
    sport?: Sport;
    area?: string;
    verifiedOnly?: boolean;
  }): Promise<HubOwnerProfileRecord[]> {
    const suspended = await this.suspendedIds();
    if (!isProduction() && (isTest() || !isServerSupabaseConfigured)) {
      await this.seedInitialHubsIfEmpty();
    }

    if (isProduction()) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in production mode.');
      }
      let query = supabaseAdmin
        .from('hub_owner_profiles')
        .select('*');

      if (filters?.verifiedOnly) {
        query = query.eq('is_verified', true);
      }
      if (filters?.area) {
        query = query.ilike('location', `%${filters.area}%`);
      }
      if (filters?.sport) {
        query = query.contains('sports', [filters.sport]);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message || 'Failed to retrieve hubs from Supabase database.');
      }
      return ((data || []) as HubOwnerProfileRecord[]).filter(h => !suspended.has(h.user_id));
    }

    const isTestMode = isInMemoryTestMode();
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode;

    if (!useMemoryStore) {
      let query = supabaseAdmin
        .from('hub_owner_profiles')
        .select('*');

      if (filters?.verifiedOnly) {
        query = query.eq('is_verified', true);
      }
      if (filters?.area) {
        query = query.ilike('location', `%${filters.area}%`);
      }
      if (filters?.sport) {
        query = query.contains('sports', [filters.sport]);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message || 'Failed to retrieve hubs from Supabase database.');
      }
      return ((data || []) as HubOwnerProfileRecord[]).filter(h => !suspended.has(h.user_id));
    }

    let records = Array.from(memoryHubOwnerProfiles.values());
    if (filters?.verifiedOnly) {
      records = records.filter((h) => h.is_verified);
    }
    if (filters?.area) {
      const areaLower = filters.area.toLowerCase();
      records = records.filter((h) => h.location.toLowerCase().includes(areaLower));
    }
    if (filters?.sport) {
      records = records.filter((h) => h.sports.includes(filters.sport!));
    }

    return records.filter(h => !suspended.has(h.user_id));
  },

  async seedInitialHubsIfEmpty(): Promise<void> {
    if (isProduction()) {
      return;
    }
    if (memoryHubOwnerProfiles.size > 0) return;

    const seedHubs = [
      {
        userId: '00000000-0000-0000-0000-000000000010',
        hubName: 'Gulberg Badminton Arena',
        contactNumber: '+92 300 1234567',
        sports: ['badminton'] as Sport[],
        location: 'Gulberg III, Lahore',
        courtCount: 4,
        isVerified: true,
      },
      {
        userId: '00000000-0000-0000-0000-000000000011',
        hubName: 'Lahore Padel Club',
        contactNumber: '+92 321 9876543',
        sports: ['padel'] as Sport[],
        location: 'DHA Phase 5, Lahore',
        courtCount: 6,
        isVerified: true,
      },
      {
        userId: '00000000-0000-0000-0000-000000000012',
        hubName: 'Model Town Sports Complex',
        contactNumber: '+92 333 5551234',
        sports: ['cricket', 'football', 'badminton'] as Sport[],
        location: 'Model Town, Lahore',
        courtCount: 8,
        isVerified: true,
      },
      {
        userId: '00000000-0000-0000-0000-000000000013',
        hubName: 'Johar Town Futsal Arena',
        contactNumber: '+92 345 4443322',
        sports: ['football'] as Sport[],
        location: 'Johar Town, Lahore',
        courtCount: 2,
        isVerified: false,
      },
    ];

    const now = new Date().toISOString();
    for (const hub of seedHubs) {
      memoryHubOwnerProfiles.set(hub.userId, {
        user_id: hub.userId,
        hub_name: hub.hubName,
        contact_number: hub.contactNumber,
        sports: hub.sports,
        location: hub.location,
        court_count: hub.courtCount,
        is_verified: hub.isVerified,
        created_at: now,
        updated_at: now,
      });
    }
  },

  // =========================================================================
  // 5. PUBLIC.MATCHES (Phase 2 Matchmaking & Fixtures)
  // =========================================================================
  async createMatch(input: CreateMatchInput): Promise<MatchOutput> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = input.openSlots === 0 ? 'FULL' : 'OPEN';

    let teamId = input.teamId ? input.teamId.trim() : null;
    if (teamId) {
      const team = await this.getTeamById(teamId);
      if (!team || team.captainId !== input.captainId) {
        throw new Error('Invalid teamId: team does not exist or does not belong to the authenticated captain.');
      }
    } else {
      try {
        const captainTeam = await this.getCaptainTeam(input.captainId);
        if (captainTeam) {
          teamId = captainTeam.id;
        }
      } catch {
        // Fallback: match without assigned team
      }
    }

    const dbRecord: MatchDbRecord = {
      id,
      captain_id: input.captainId,
      team_id: teamId,
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

    const isTestMode = isInMemoryTestMode();
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
    const suspended = await this.suspendedIds();
    const isTestMode = isInMemoryTestMode();
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
        return Promise.all(data.filter((m: MatchDbRecord) => isUpcomingMatch(m.date, m.start_time) && !suspended.has(m.captain_id)).map((m: MatchDbRecord) => enrichMatch(m)));
      }
      return [];
    }

    let records = Array.from(memoryMatches.values()).filter((m) =>
      ['OPEN', 'UPCOMING', 'FULL'].includes(m.status) && isUpcomingMatch(m.date, m.start_time) && !suspended.has(m.captain_id));
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    if (isProduction()) {
      return;
    }

    // 1. Seed admin if missing
    await this.seedAdminIfMissing();

    const isTestMode = isTest();
    // 2. Check if matches already seeded
    if (memoryMatches.size > 0) return;

    if (!isTestMode && isServerSupabaseConfigured) {
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

    const captainMatches = Array.from(memoryMatches.values()).filter((m) => m.captain_id === defaultCaptainId);
    if (captainMatches.length > 0 && memoryJoinRequests.size === 0) {
      const demoReqId = 'seed_req_demo_1';
      memoryJoinRequests.set(demoReqId, {
        id: demoReqId,
        match_id: captainMatches[0].id,
        player_id: '00000000-0000-0000-0000-000000000001',
        status: 'PENDING',
        message: 'Midfielder with great stamina. Looking forward to the match!',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  },

  // Helper for seed admin
  async seedAdminIfMissing(): Promise<void> {
    // Never create an administrator with a shared password in a live database.
    if (!isTest()) return;
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
  },

  // =========================================================================
  // 6. PUBLIC.JOIN_REQUESTS & PUBLIC.MATCH_PARTICIPANTS (Phase 3)
  // =========================================================================
  async getJoinRequestById(requestId: string): Promise<JoinRequestDbRecord | null> {
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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

    const isTestMode = isInMemoryTestMode();
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    if (!isTestMode && (!isValidUuid(input.matchId) || !isValidUuid(input.playerId))) {
      throw new Error('Valid match and player IDs are required.');
    }
    if (!isTestMode) {
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
    if (!isTestMode && !isServerSupabaseConfigured) {
      throw new Error('Supabase live configuration is required in non-test mode.');
    }
    const useMemoryStore = isTestMode || !isValidUuid(requestId) || !isValidUuid(captainId);

    if (!useMemoryStore) {
      const {data,error} = await supabaseAdmin.rpc('reject_join_request',{p_request_id:requestId,p_captain_id:captainId});
      if(error) return {success:false,code:'SERVER_ERROR',error:error.message};
      if(!data?.success) return data;
      return {success:true,request:{id:data.requestId,matchId:data.matchId,playerId:data.playerId,status:'REJECTED',createdAt:data.updatedAt,updatedAt:data.updatedAt}};
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

  setMatchOpenSlotsForTest(matchId: string, openSlots: number, status?: 'OPEN' | 'FULL'): void {
    const mem = memoryMatches.get(matchId);
    if (mem) {
      mem.open_slots = openSlots;
      mem.status = status || (openSlots <= 0 ? 'FULL' : 'OPEN');
      memoryMatches.set(matchId, mem);
    }
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
    const isTestMode = isInMemoryTestMode();
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

    const isTestMode = isInMemoryTestMode();
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
        throw new Error('Notification persistence unavailable.');
      }
    }

    if (!isTestMode) throw new Error('Notification persistence unavailable.');
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
    const isTestMode = isInMemoryTestMode();
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
        throw new Error('Notifications unavailable.');
      }
    }

    if (!isTestMode) throw new Error('Notifications unavailable.');
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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

    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();

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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .select('id, room_id, sender_id, body, created_at, client_message_id, profiles(id, name, role)')
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
        clientMessageId: m.client_message_id || undefined,
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
        clientMessageId: m.client_message_id || undefined,
        createdAt: m.created_at,
      };
    });
  },

  async createChatMessage(input: { roomId: string; senderId: string; body: string; clientMessageId?: string }): Promise<ChatMessageOutput> {
    const key = input.clientMessageId;
    if (key !== undefined && (typeof key !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(key))) throw new Error('Invalid clientMessageId.');
    const toOutput = async (row: ChatMessageDbRecord): Promise<ChatMessageOutput> => {
      const profile = await this.getProfile(row.sender_id);
      return {id: row.id, roomId: row.room_id, senderId: row.sender_id, senderName: profile?.name || 'User', senderRole: profile?.role, body: row.body, createdAt: row.created_at, clientMessageId: row.client_message_id || undefined};
    };
    const row: ChatMessageDbRecord = {id: crypto.randomUUID(), room_id: input.roomId, sender_id: input.senderId, body: input.body.trim(), created_at: new Date().toISOString(), client_message_id: key || null};
    if (isInMemoryTestMode()) {
      const existing = key && [...memoryChatMessages.values()].find(m => m.room_id === input.roomId && m.sender_id === input.senderId && m.client_message_id === key);
      if (existing) return toOutput(existing);
      memoryChatMessages.set(row.id, row);
      const room = memoryChatRooms.get(input.roomId);
      if (room) room.updated_at = row.created_at;
      return toOutput(row);
    }
    if (!isServerSupabaseConfigured) throw new Error('Supabase live configuration is required in non-test mode.');
    const {data, error} = await supabaseAdmin.from('chat_messages').insert(row).select().single();
    if (error?.code === '23505' && key) {
      const prior = await supabaseAdmin.from('chat_messages').select('*').eq('room_id', input.roomId).eq('sender_id', input.senderId).eq('client_message_id', key).single();
      if (prior.error || !prior.data) throw new Error('Unable to retrieve previous message.');
      return toOutput(prior.data);
    }
    if (error || !data) throw new Error(error?.message || 'Message persistence failed.');
    const update = await supabaseAdmin.from('chat_rooms').update({updated_at: row.created_at}).eq('id', input.roomId);
    if (update.error) console.warn('[Chat] Room timestamp update failed; message is persisted.');
    return toOutput(data);
  },

  // =========================================================================
  // 9. PUBLIC.HUB_COURTS (Phase 5 Facility & Court Management)
  // =========================================================================

  async getHubCourtsByOwner(hubOwnerId: string): Promise<HubCourtOutput[]> {
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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

    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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

    const isTestMode = isInMemoryTestMode();
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

  async getLatestHubVerificationRequestByOwner(
    hubOwnerId: string
  ): Promise<HubVerificationOutput | null> {
    const isTestMode = isInMemoryTestMode();
    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      const { data, error } = await supabaseAdmin
        .from('hub_verification_requests')
        .select('*')
        .eq('hub_owner_id', hubOwnerId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to query latest verification request.');
      }
      return data ? formatHubVerificationOutput(data) : null;
    }

    const requests = Array.from(memoryHubVerificationRequests.values())
      .filter((r) => r.hub_owner_id === hubOwnerId)
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));

    return requests.length > 0 ? formatHubVerificationOutput(requests[0]) : null;
  },

  async getHubDashboardSummary(hubOwnerId: string): Promise<HubDashboardSummaryOutput> {
    const hub = await this.getHubOwnerProfile(hubOwnerId);
    if (!hub) {
      throw new Error('Hub owner profile not found.');
    }

    const courts = await this.getHubCourtsByOwner(hubOwnerId);
    const latestVerification = await this.getLatestHubVerificationRequestByOwner(hubOwnerId);

    const availableCount = courts.filter((c) => c.status === 'AVAILABLE').length;
    const limitedCount = courts.filter((c) => c.status === 'LIMITED').length;
    const unavailableCount = courts.filter((c) => c.status === 'UNAVAILABLE').length;

    // Keep court_count on profile aligned with actual court records
    if (hub.court_count !== courts.length) {
      hub.court_count = courts.length;
    }

    return {
      hub: {
        id: hub.user_id,
        name: hub.hub_name,
        location: hub.location,
        contactNumber: hub.contact_number || null,
        sports: hub.sports,
        courtCount: courts.length,
        isVerified: hub.is_verified,
      },
      verification: latestVerification
        ? {
            status: latestVerification.status,
            adminNote: latestVerification.adminNote,
            submittedAt: latestVerification.submittedAt,
            reviewedAt: latestVerification.reviewedAt,
          }
        : {
            status: 'NOT_SUBMITTED',
            adminNote: null,
            submittedAt: null,
            reviewedAt: null,
          },
      courts: {
        total: courts.length,
        available: availableCount,
        limited: limitedCount,
        unavailable: unavailableCount,
      },
    };
  },

  async getHubVerificationRequests(filter?: {
    status?: HubVerificationStatus;
  }): Promise<AdminHubVerificationOutput[]> {
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();

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

    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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
    const isTestMode = isInMemoryTestMode();
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

    const isTestMode = isInMemoryTestMode();
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

  async getAdminDashboardSummary(): Promise<AdminDashboardSummaryOutput> {
    const isTestMode = isInMemoryTestMode();

    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }

      const [usersRes, matchesTotalRes, matchesOpenRes, hubsTotalRes, hubsVerifiedRes, verifPendingRes, reportsOpenRes] =
        await Promise.all([
          supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('matches').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
          supabaseAdmin.from('hub_owner_profiles').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('hub_owner_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
          supabaseAdmin.from('hub_verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
          supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
        ]);

      for (const result of [usersRes, matchesTotalRes, matchesOpenRes, hubsTotalRes, hubsVerifiedRes, verifPendingRes, reportsOpenRes]) {
        if (result.error || result.count == null) throw new Error('Admin dashboard counts are unavailable.');
      }
      return {
        users: {
          total: usersRes.count!,
        },
        matches: {
          total: matchesTotalRes.count ?? 0,
          open: matchesOpenRes.count ?? 0,
        },
        hubs: {
          total: hubsTotalRes.count ?? 0,
          verified: hubsVerifiedRes.count ?? 0,
          pendingVerification: verifPendingRes.count ?? 0,
        },
        reports: {
          open: reportsOpenRes.count ?? 0,
        },
      };
    }

    const totalUsers = memoryProfiles.size;
    const allMatches = Array.from(memoryMatches.values());
    const totalMatches = allMatches.length;
    const openMatches = allMatches.filter((m) => m.status === 'OPEN').length;

    const allHubs = Array.from(memoryHubOwnerProfiles.values());
    const totalHubs = allHubs.length;
    const verifiedHubs = allHubs.filter((h) => h.is_verified === true).length;
    const pendingVerifications = Array.from(memoryHubVerificationRequests.values()).filter(
      (r) => r.status === 'PENDING'
    ).length;

    const openReports = Array.from(memoryReports.values()).filter((r) => r.status === 'OPEN').length;

    return {
      users: {
        total: totalUsers,
      },
      matches: {
        total: totalMatches,
        open: openMatches,
      },
      hubs: {
        total: totalHubs,
        verified: verifiedHubs,
        pendingVerification: pendingVerifications,
      },
      reports: {
        open: openReports,
      },
    };
  },

  async getAdminHubs(filter?: {
    status?: string;
    sport?: Sport;
  }): Promise<AdminHubListItem[]> {
    const isTestMode = isInMemoryTestMode();

    if (!isTestMode) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }

      let query = supabaseAdmin
        .from('hub_owner_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter?.sport) {
        query = query.contains('sports', [filter.sport]);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message || 'Failed to query hubs for admin.');
      }

      const results: AdminHubListItem[] = [];
      for (const hub of data || []) {
        const owner = await this.getProfile(hub.user_id);
        const latestVerif = await this.getLatestHubVerificationRequestByOwner(hub.user_id);
        const resolvedVerificationStatus: HubVerificationStatus | 'NOT_SUBMITTED' =
          hub.is_verified
            ? 'APPROVED'
            : latestVerif?.status || 'NOT_SUBMITTED';

        if (filter?.status) {
          const upper = filter.status.toUpperCase();
          if (upper === 'VERIFIED' && !hub.is_verified) continue;
          if (upper === 'PENDING' && resolvedVerificationStatus !== 'PENDING') continue;
          if (upper === 'REJECTED' && resolvedVerificationStatus !== 'REJECTED') continue;
        }

        results.push({
          id: hub.user_id,
          userId: hub.user_id,
          hubName: hub.hub_name,
          ownerName: owner?.name || 'Unknown Owner',
          location: hub.location,
          contactNumber: hub.contact_number || null,
          sports: hub.sports || [],
          courtCount: hub.court_count || 0,
          isVerified: Boolean(hub.is_verified),
          verificationStatus: resolvedVerificationStatus,
          createdAt: hub.created_at,
        });
      }

      return results;
    }

    const allHubs = Array.from(memoryHubOwnerProfiles.values());
    const results: AdminHubListItem[] = [];

    for (const hub of allHubs) {
      if (filter?.sport && (!hub.sports || !hub.sports.includes(filter.sport))) {
        continue;
      }

      const owner = memoryProfiles.get(hub.user_id);
      const ownerVerifRequests = Array.from(memoryHubVerificationRequests.values())
        .filter((r) => r.hub_owner_id === hub.user_id)
        .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
      const latestVerif = ownerVerifRequests.length > 0 ? ownerVerifRequests[0] : null;

      const resolvedVerificationStatus: HubVerificationStatus | 'NOT_SUBMITTED' =
        hub.is_verified
          ? 'APPROVED'
          : latestVerif?.status || 'NOT_SUBMITTED';

      if (filter?.status) {
        const upper = filter.status.toUpperCase();
        if (upper === 'VERIFIED' && !hub.is_verified) continue;
        if (upper === 'PENDING' && resolvedVerificationStatus !== 'PENDING') continue;
        if (upper === 'REJECTED' && resolvedVerificationStatus !== 'REJECTED') continue;
      }

      results.push({
        id: hub.user_id,
        userId: hub.user_id,
        hubName: hub.hub_name,
        ownerName: owner?.name || 'Unknown Owner',
        location: hub.location,
        contactNumber: hub.contact_number || null,
        sports: hub.sports || [],
        courtCount: hub.court_count || 0,
        isVerified: Boolean(hub.is_verified),
        verificationStatus: resolvedVerificationStatus,
        createdAt: hub.created_at,
      });
    }

    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return results;
  },

  // =========================================================================
  // 11. PUBLIC.TEAMS & PUBLIC.TEAM_MEMBERS (Phase B)
  // =========================================================================
  async getCaptainTeam(captainId: string): Promise<TeamOutput | null> {
    const isTestMode = isInMemoryTestMode();
    if (!isTestMode && isValidUuid(captainId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      try {
        const { data, error } = await supabaseAdmin
          .from('teams')
          .select('*')
          .eq('captain_id', captainId)
          .maybeSingle();

        if (error) {
          throw new Error(error.message || 'Failed to query captain team.');
        }
        if (data) {
          const { count } = await supabaseAdmin
            .from('team_members')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', data.id)
            .eq('status', 'ACTIVE');
          return formatTeamOutput(data as TeamDbRecord, count ?? 1);
        }
        return null;
      } catch (err) {
        throw err;
      }
    }

    if (!isTestMode) return null;
    for (const t of memoryTeams.values()) {
      if (t.captain_id === captainId) {
        let memberCount = 0;
        for (const m of memoryTeamMembers.values()) {
          if (m.team_id === t.id && m.status === 'ACTIVE') memberCount++;
        }
        return formatTeamOutput(t, memberCount || 1);
      }
    }
    return null;
  },

  async getTeamById(teamId: string): Promise<TeamOutput | null> {
    const isTestMode = isInMemoryTestMode();
    if (!isTestMode && isValidUuid(teamId)) {
      if (!isServerSupabaseConfigured) {
        throw new Error('Supabase live configuration is required in non-test mode.');
      }
      try {
        const { data, error } = await supabaseAdmin
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .maybeSingle();

        if (error) {
          throw new Error(error.message || 'Failed to query team by id.');
        }
        if (data) {
          const { count } = await supabaseAdmin
            .from('team_members')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', data.id)
            .eq('status', 'ACTIVE');
          return formatTeamOutput(data as TeamDbRecord, count ?? 1);
        }
        return null;
      } catch (err) {
        throw err;
      }
    }

    if (!isTestMode) return null;
    const mem = memoryTeams.get(teamId);
    if (!mem) return null;
    let memberCount = 0;
    for (const m of memoryTeamMembers.values()) {
      if (m.team_id === mem.id && m.status === 'ACTIVE') memberCount++;
    }
    return formatTeamOutput(mem, memberCount || 1);
  },

  async createTeam(data: {
    captainId: string;
    name: string;
    sport: Sport;
    skillLevel: SkillLevel;
    area: string;
  }): Promise<TeamOutput> {
    if (!isInMemoryTestMode() && (!isServerSupabaseConfigured || !isValidUuid(data.captainId))) {
      throw new Error('A valid captain ID and Supabase configuration are required.');
    }
    const existing = await this.getCaptainTeam(data.captainId);
    if (existing) {
      throw new Error('Captain already has a registered team.');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const dbRecord: TeamDbRecord = {
      id,
      captain_id: data.captainId,
      name: data.name.trim(),
      sport: data.sport,
      skill_level: data.skillLevel,
      area: data.area.trim(),
      created_at: now,
      updated_at: now,
    };

    const isTestMode = isInMemoryTestMode();
    const useMemoryStore = isTestMode || !isValidUuid(data.captainId);

    if (!useMemoryStore) {
      const { data: inserted, error } = await supabaseAdmin
        .from('teams')
        .insert([dbRecord])
        .select()
        .single();

      if (error || !inserted) {
        throw new Error(error?.code === '23505' ? 'Captain already has a registered team.' : error?.message || 'Failed to create team in Supabase.');
      }

      // Add captain as active team member
      const memberId = crypto.randomUUID();
      const memberRecord: TeamMemberDbRecord = {
        id: memberId,
        team_id: inserted.id,
        user_id: data.captainId,
        member_role: 'CAPTAIN',
        status: 'ACTIVE',
        joined_at: now,
      };
      const { error: memberError } = await supabaseAdmin.from('team_members').insert([memberRecord]);
      if (memberError) {
        // Roll back only the team created by this operation.
        const { error: rollbackError } = await supabaseAdmin.from('teams').delete().eq('id', inserted.id);
        if (rollbackError) throw new Error('Team membership failed and team cleanup failed.');
        throw new Error(memberError.message || 'Failed to save captain team membership.');
      }

      return formatTeamOutput(inserted as TeamDbRecord, 1);
    }

    if ([...memoryTeams.values()].some(t => t.captain_id === data.captainId)) throw new Error('Captain already has a registered team.');
    memoryTeams.set(id, dbRecord);

    const memberId = crypto.randomUUID();
    const memberRecord: TeamMemberDbRecord = {
      id: memberId,
      team_id: id,
      user_id: data.captainId,
      member_role: 'CAPTAIN',
      status: 'ACTIVE',
      joined_at: now,
    };
    memoryTeamMembers.set(memberId, memberRecord);

    return formatTeamOutput(dbRecord, 1);
  },

  async updateTeam(
    teamId: string,
    captainId: string,
    data: Partial<{
      name: string;
      sport: Sport;
      skillLevel: SkillLevel;
      area: string;
    }>
  ): Promise<TeamOutput> {
    const isTestMode = isInMemoryTestMode();
    const useMemoryStore = isTestMode || !isValidUuid(teamId);
    const now = new Date().toISOString();

    if (!useMemoryStore) {
      const { data: team, error: tErr } = await supabaseAdmin
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .maybeSingle();

      if (tErr || !team) {
        throw new Error('Team not found.');
      }

      if (team.captain_id !== captainId) {
        throw new Error('Only the team captain can update team details.');
      }

      const updatePayload: any = { updated_at: now };
      if (data.name !== undefined) updatePayload.name = data.name.trim();
      if (data.sport !== undefined) updatePayload.sport = data.sport;
      if (data.skillLevel !== undefined) updatePayload.skill_level = data.skillLevel;
      if (data.area !== undefined) updatePayload.area = data.area.trim();

      const { data: updated, error: uErr } = await supabaseAdmin
        .from('teams')
        .update(updatePayload)
        .eq('id', teamId)
        .select()
        .single();

      if (uErr || !updated) {
        throw new Error(uErr?.message || 'Failed to update team.');
      }

      const { count } = await supabaseAdmin
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'ACTIVE');

      return formatTeamOutput(updated as TeamDbRecord, count ?? 1);
    }

    const team = memoryTeams.get(teamId);
    if (!team) {
      throw new Error('Team not found.');
    }

    if (team.captain_id !== captainId) {
      throw new Error('Only the team captain can update team details.');
    }

    if (data.name !== undefined) team.name = data.name.trim();
    if (data.sport !== undefined) team.sport = data.sport;
    if (data.skillLevel !== undefined) team.skill_level = data.skillLevel;
    if (data.area !== undefined) team.area = data.area.trim();
    team.updated_at = now;
    memoryTeams.set(teamId, team);

    let memberCount = 0;
    for (const m of memoryTeamMembers.values()) {
      if (m.team_id === teamId && m.status === 'ACTIVE') memberCount++;
    }

    return formatTeamOutput(team, memberCount || 1);
  },

  async getTeamMembers(teamId: string): Promise<TeamMemberOutput[]> {
    const isTestMode = isInMemoryTestMode();
    const useMemoryStore = isTestMode || !isValidUuid(teamId);

    if (!useMemoryStore) {
      const { data, error } = await supabaseAdmin
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Failed to fetch team members.');
      }

      const formatted = await Promise.all((data || []).map((m: TeamMemberDbRecord) => formatTeamMemberOutput(m)));
      return formatted.sort((a, b) => {
        if (a.memberRole === 'CAPTAIN') return -1;
        if (b.memberRole === 'CAPTAIN') return 1;
        if (a.memberRole === 'VICE_CAPTAIN') return -1;
        if (b.memberRole === 'VICE_CAPTAIN') return 1;
        return 0;
      });
    }

    const members = Array.from(memoryTeamMembers.values()).filter((m) => m.team_id === teamId);
    const formatted = await Promise.all(members.map((m) => formatTeamMemberOutput(m)));
    return formatted.sort((a, b) => {
      if (a.memberRole === 'CAPTAIN') return -1;
      if (b.memberRole === 'CAPTAIN') return 1;
      if (a.memberRole === 'VICE_CAPTAIN') return -1;
      if (b.memberRole === 'VICE_CAPTAIN') return 1;
      return 0;
    });
  },

  async addTeamMember(
    teamId: string,
    captainId: string,
    data: {
      userId: string;
      memberRole?: TeamMemberRole;
      status?: TeamMemberStatus;
    }
  ): Promise<TeamMemberOutput> {
    const team = await this.getTeamById(teamId);
    if (!team) {
      throw new Error('Team not found.');
    }
    if (team.captainId !== captainId) {
      throw new Error('Only the team captain can add members to the roster.');
    }

    const userProfile = await this.getProfile(data.userId);
    if (!userProfile) {
      throw new Error('Target user does not exist.');
    }

    if (data.userId === captainId) {
      throw new Error('Captain is already the primary owner of this team.');
    }

    if (data.memberRole === 'CAPTAIN') {
      throw new Error('Cannot designate multiple primary captains. Use VICE_CAPTAIN or PLAYER.');
    }

    const targetRoles = await this.getUserRoles(data.userId);
    if (!targetRoles.includes('PLAYER')) {
      throw new Error('Target user must have the PLAYER capability to join a team roster.');
    }

    const now = new Date().toISOString();
    const isTestMode = isInMemoryTestMode();
    const useMemoryStore = isTestMode || !isValidUuid(teamId) || !isValidUuid(data.userId);

    if (!useMemoryStore) {
      const { data: existing, error: eErr } = await supabaseAdmin
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', data.userId)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'ACTIVE') {
          throw new Error('User is already an active member of this team.');
        }
        const { data: updated, error: uErr } = await supabaseAdmin
          .from('team_members')
          .update({
            status: data.status || 'ACTIVE',
            member_role: data.memberRole || 'PLAYER',
            joined_at: now,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (uErr || !updated) {
          throw new Error(uErr?.message || 'Failed to update team member.');
        }
        return formatTeamMemberOutput(updated as TeamMemberDbRecord);
      }

      const memberId = crypto.randomUUID();
      const newMember: TeamMemberDbRecord = {
        id: memberId,
        team_id: teamId,
        user_id: data.userId,
        member_role: data.memberRole || 'PLAYER',
        status: data.status || 'ACTIVE',
        joined_at: now,
      };

      const { data: inserted, error: iErr } = await supabaseAdmin
        .from('team_members')
        .insert([newMember])
        .select()
        .single();

      if (iErr || !inserted) {
        throw new Error(iErr?.message || 'Failed to add team member.');
      }
      return formatTeamMemberOutput(inserted as TeamMemberDbRecord);
    }

    for (const [id, m] of memoryTeamMembers.entries()) {
      if (m.team_id === teamId && m.user_id === data.userId) {
        if (m.status === 'ACTIVE') {
          throw new Error('User is already an active member of this team.');
        }
        m.status = data.status || 'ACTIVE';
        m.member_role = data.memberRole || 'PLAYER';
        m.joined_at = now;
        memoryTeamMembers.set(id, m);
        return formatTeamMemberOutput(m);
      }
    }

    const memberId = crypto.randomUUID();
    const newMember: TeamMemberDbRecord = {
      id: memberId,
      team_id: teamId,
      user_id: data.userId,
      member_role: data.memberRole || 'PLAYER',
      status: data.status || 'ACTIVE',
      joined_at: now,
    };
    memoryTeamMembers.set(memberId, newMember);
    return formatTeamMemberOutput(newMember);
  },

  async removeTeamMember(teamId: string, captainId: string, userId: string): Promise<void> {
    const team = await this.getTeamById(teamId);
    if (!team) {
      throw new Error('Team not found.');
    }
    if (team.captainId !== captainId) {
      throw new Error('Only the team captain can remove members from the roster.');
    }
    if (userId === captainId) {
      throw new Error('Captain cannot remove themselves from their own team roster.');
    }

    const isTestMode = isInMemoryTestMode();
    const useMemoryStore = isTestMode || !isValidUuid(teamId) || !isValidUuid(userId);

    if (!useMemoryStore) {
      const { error } = await supabaseAdmin
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message || 'Failed to remove team member.');
      }
      return;
    }

    for (const [id, m] of memoryTeamMembers.entries()) {
      if (m.team_id === teamId && m.user_id === userId) {
        memoryTeamMembers.delete(id);
        return;
      }
    }
  },

  async updateMatchRecruitment(matchId: string, captainId: string, openSlots: number): Promise<MatchOutput> {
    const now = new Date().toISOString();
    const isTestMode = isInMemoryTestMode();
    const useMemoryStore = isTestMode || !isValidUuid(matchId) || !isValidUuid(captainId);

    if (!useMemoryStore) {
      const {data, error} = await supabaseAdmin.rpc('update_match_recruitment', {p_match_id: matchId, p_captain_id: captainId, p_open_slots: openSlots});
      if (error) throw new Error(error.message || 'Could not update recruitment.');
      return enrichMatch(data as MatchDbRecord);
    }

    const match = memoryMatches.get(matchId);
    if (!match) {
      throw new Error('Match not found.');
    }
    if (match.captain_id !== captainId) {
      throw new Error('Only the match captain can update recruitment.');
    }

    let confirmed = 0;
    for (const p of memoryMatchParticipants.values()) {
      if (p.match_id === matchId) {
        confirmed++;
      }
    }

    const maxAllowedOpenSlots = match.total_capacity - confirmed;

    if (typeof openSlots !== 'number' || isNaN(openSlots) || openSlots < 0 || openSlots > maxAllowedOpenSlots) {
      throw new Error(`openSlots must be between 0 and ${maxAllowedOpenSlots}.`);
    }

    const newStatus = openSlots === 0 ? 'FULL' : 'OPEN';
    match.open_slots = openSlots;
    match.status = newStatus;
    match.updated_at = now;
    memoryMatches.set(matchId, match);

    return enrichMatch(match);
  },
};



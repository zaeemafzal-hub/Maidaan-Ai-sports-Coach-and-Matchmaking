/**
 * Maidaan Domain Types
 * Core entities for mobile app and onboarding
 */

export type Role = 'PLAYER' | 'TEAM_CAPTAIN' | 'HUB_OWNER' | 'ADMIN';
export type UserRole = Role;
export type AppMode = 'PLAYER' | 'TEAM_CAPTAIN' | 'HUB_OWNER' | 'ADMIN';

export type Sport = 'cricket' | 'badminton' | 'padel' | 'football';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface OnboardingStatus {
  player: boolean;
  captain: boolean;
  hubOwner: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;        // legacy compatibility
  roles: Role[];     // authoritative capabilities array
  onboardingCompleted?: boolean;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
}

export interface PlayerProfile {
  userId: string;
  preferredSports: Sport[];
  skillLevel: SkillLevel;
  primaryLocation: string;
  bio?: string;
  matchesPlayed: number;
}

export interface CaptainProfile {
  userId: string;
  teamName: string;
  sports: Sport[];
  skillLevel?: SkillLevel;
  primaryLocation?: string;
  homeHubId?: string;
}

export interface HubOwnerProfile {
  userId: string;
  hubName: string;
  location: string;
  courtsCount: number;
  isVerified: boolean;
  contactNumber?: string;
  sports?: Sport[];
}

export type CourtStatus = 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';

export interface HubCourt {
  id: string;
  name: string;
  sport: Sport;
  status: CourtStatus;
  createdAt: string;
  updatedAt: string;
}

export type ChatRoomType = 'DIRECT' | 'GROUP' | 'direct' | 'group';

export interface ChatMember {
  id: string;
  name: string;
  role?: Role;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole?: Role;
  body: string;
  text?: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  title: string;
  participantName?: string;
  participantRole?: string;
  matchId?: string | null;
  matchTitle?: string;
  matchSport?: Sport;
  matchTime?: string;
  matchVenue?: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  members?: ChatMember[];
}

export type NotificationType =
  | 'join_request_accepted'
  | 'join_request_rejected'
  | 'join_request_pending'
  | 'match_reminder'
  | 'chat_message'
  | 'hub_verification'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  matchId?: string;
  chatRoomId?: string;
  roleContext?: Role;
}

export type HubVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface HubDashboardSummary {
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
    isVerified?: boolean;
  };
  courts: {
    total: number;
    available: number;
    limited: number;
    unavailable: number;
  };
}

export interface AdminDashboardSummary {
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

export interface HubVerificationRequest {
  id: string;
  hubOwnerId: string;
  status: HubVerificationStatus;
  adminNote?: string | null;
  reviewedBy?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  hubName: string;
  contactNumber?: string | null;
  sports: Sport[];
  location: string;
  courtCount: number;
  isVerified: boolean;
}

export type ReportCategory =
  | 'CONDUCT'
  | 'HARASSMENT'
  | 'UNSAFE_BEHAVIOR'
  | 'SPAM'
  | 'OTHER';

export type ReportStatus =
  | 'OPEN'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'FOLLOW_UP';

export interface AdminReport {
  id: string;
  reporterId: string;
  reportedUserId?: string | null;
  matchId?: string | null;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  adminNote?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  reporterName?: string;
  reportedUserName?: string | null;
  matchTitle?: string | null;
  matchSport?: string | null;
}

export type CoachSport = 'cricket' | 'football' | 'badminton' | 'padel';

export interface CoachConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachResponse {
  message: string;
  sport: CoachSport;
  provider: 'nvidia';
  requestId?: string;
}



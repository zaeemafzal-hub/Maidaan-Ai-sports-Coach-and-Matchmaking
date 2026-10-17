import { Request, Response } from 'express';
import { SupabaseRepo, Sport, SkillLevel, Role } from '../models/supabaseRepo.js';

const VALID_SPORTS: Sport[] = ['cricket', 'badminton', 'padel', 'football'];
const VALID_SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
const ALLOWED_PUBLIC_ROLES: Role[] = ['PLAYER', 'TEAM_CAPTAIN', 'HUB_OWNER'];

export const ProfileController = {
  /**
   * Initialize or sync public.profiles row after Supabase Auth signup.
   * Rejects ADMIN role registration attempts.
   */
  async initProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const { name, role } = req.body;
      const userId = req.auth.userId;
      const email = req.auth.email;

      // 1. Validate name
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({
          error: 'Full name is required and must be at least 2 characters.',
        });
        return;
      }

      // 2. Validate role: default to PLAYER for new accounts
      const assignedRole: Role = role && typeof role === 'string' ? (role as Role) : 'PLAYER';

      if (assignedRole === 'ADMIN') {
        res.status(403).json({
          error: 'Administrator accounts cannot be created via public registration.',
        });
        return;
      }

      if (!ALLOWED_PUBLIC_ROLES.includes(assignedRole)) {
        res.status(400).json({
          error: `Invalid role selected. Must be one of: ${ALLOWED_PUBLIC_ROLES.join(', ')}.`,
        });
        return;
      }

      // 3. Create or fetch profile
      let profile = await SupabaseRepo.getProfile(userId);
      if (!profile) {
        profile = await SupabaseRepo.createProfile({
          id: userId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: assignedRole,
        });
      } else {
        await SupabaseRepo.addRole(userId, assignedRole);
      }

      const roles = await SupabaseRepo.getUserRoles(userId);

      res.status(200).json({
        success: true,
        user: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          roles,
          onboardingCompleted: profile.onboarding_completed,
          createdAt: profile.created_at,
        },
        roles,
      });
    } catch (error) {
      console.error('[ProfileController.initProfile] Error:', error);
      res.status(500).json({ error: 'Failed to initialize user profile.' });
    }
  },

  /**
   * Get current authenticated user details and role profiles.
   * Supports multi-role architecture: returns all active capabilities and role profiles.
   * Used for session restoration on app startup.
   */
  async getMyProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const profile = await SupabaseRepo.getProfile(userId);

      if (!profile) {
        res.status(404).json({ error: 'User profile not found.' });
        return;
      }

      const roles = await SupabaseRepo.getUserRoles(userId);

      // Concurrently fetch all role-specific profiles the user holds
      const [pRecord, cRecord, hRecord] = await Promise.all([
        SupabaseRepo.getPlayerProfile(userId),
        SupabaseRepo.getCaptainProfile(userId),
        SupabaseRepo.getHubOwnerProfile(userId),
      ]);

      const playerProfile = pRecord
        ? {
            userId: pRecord.user_id,
            preferredSports: pRecord.preferred_sports,
            skillLevel: pRecord.skill_level,
            primaryLocation: pRecord.primary_location,
            matchesPlayed: pRecord.matches_played,
          }
        : null;

      const captainProfile = cRecord
        ? {
            userId: cRecord.user_id,
            teamName: cRecord.team_name,
            sports: cRecord.sports,
            skillLevel: cRecord.skill_level,
            primaryLocation: cRecord.primary_location,
          }
        : null;

      const hubOwnerProfile = hRecord
        ? {
            userId: hRecord.user_id,
            hubName: hRecord.hub_name,
            location: hRecord.location,
            courtsCount: hRecord.court_count,
            contactNumber: hRecord.contact_number,
            sports: hRecord.sports,
            isVerified: hRecord.is_verified,
          }
        : null;

      res.status(200).json({
        user: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role, // legacy compatibility
          roles,              // authoritative multi-role array
          onboardingCompleted: profile.onboarding_completed,
          createdAt: profile.created_at,
        },
        roles,
        onboarding: {
          player: Boolean(playerProfile),
          captain: Boolean(captainProfile),
          hubOwner: Boolean(hubOwnerProfile),
        },
        playerProfile,
        captainProfile,
        hubOwnerProfile,
      });
    } catch (error) {
      console.error('[ProfileController.getMyProfile] Error:', error);
      res.status(500).json({ error: 'Failed to retrieve profile.' });
    }
  },

  /**
   * Save or update Player profile.
   * Protected by authorizeRoles('PLAYER').
   * IDOR protection: Strictly uses req.auth.userId.
   */
  async updatePlayerProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const { preferredSports, skillLevel, primaryLocation } = req.body;

      // 1. Validate preferred sports
      if (!Array.isArray(preferredSports) || preferredSports.length === 0) {
        res.status(400).json({
          error: 'Please select at least one preferred sport.',
        });
        return;
      }

      const invalidSport = preferredSports.find((s) => !VALID_SPORTS.includes(s));
      if (invalidSport) {
        res.status(400).json({
          error: `Invalid sport "${invalidSport}". Allowed sports: ${VALID_SPORTS.join(', ')}.`,
        });
        return;
      }

      // 2. Validate skill level
      if (!skillLevel || !VALID_SKILL_LEVELS.includes(skillLevel)) {
        res.status(400).json({
          error: `Skill level must be one of: ${VALID_SKILL_LEVELS.join(', ')}.`,
        });
        return;
      }

      // 3. Validate primary location
      if (!primaryLocation || typeof primaryLocation !== 'string' || primaryLocation.trim().length < 2) {
        res.status(400).json({
          error: 'Primary location/area is required.',
        });
        return;
      }

      // 4. Save player profile (server controls matches_played: 0)
      const record = await SupabaseRepo.upsertPlayerProfile({
        userId,
        preferredSports: preferredSports as Sport[],
        skillLevel: skillLevel as SkillLevel,
        primaryLocation: primaryLocation.trim(),
        matchesPlayed: 0,
      });

      // 5. Mark onboarding complete in public.profiles
      const updatedProfile = await SupabaseRepo.setOnboardingCompleted(userId, true);

      res.status(200).json({
        success: true,
        profile: {
          userId: record.user_id,
          preferredSports: record.preferred_sports,
          skillLevel: record.skill_level,
          primaryLocation: record.primary_location,
          matchesPlayed: record.matches_played,
        },
        user: updatedProfile
          ? {
              id: updatedProfile.id,
              name: updatedProfile.name,
              email: updatedProfile.email,
              role: updatedProfile.role,
              onboardingCompleted: updatedProfile.onboarding_completed,
            }
          : undefined,
      });
    } catch (error) {
      console.error('[ProfileController.updatePlayerProfile] Error:', error);
      res.status(500).json({ error: 'Failed to save player profile.' });
    }
  },

  /**
   * Save or update Captain profile.
   * Protected by authorizeRoles('TEAM_CAPTAIN').
   * IDOR protection: Strictly uses req.auth.userId.
   */
  async updateCaptainProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const { teamName, sports, skillLevel, primaryLocation } = req.body;

      // 1. Validate team name
      if (!teamName || typeof teamName !== 'string' || teamName.trim().length < 2) {
        res.status(400).json({
          error: 'Team name is required and must be at least 2 characters.',
        });
        return;
      }

      // 2. Validate sports
      if (!Array.isArray(sports) || sports.length === 0) {
        res.status(400).json({
          error: 'At least one sport must be selected for the captain profile.',
        });
        return;
      }

      const invalidSport = sports.find((s) => !VALID_SPORTS.includes(s));
      if (invalidSport) {
        res.status(400).json({
          error: `Invalid sport "${invalidSport}". Allowed sports: ${VALID_SPORTS.join(', ')}.`,
        });
        return;
      }

      // 3. Skill level validation
      const resolvedSkill = skillLevel && VALID_SKILL_LEVELS.includes(skillLevel) ? skillLevel : 'intermediate';

      // 4. Primary location
      const resolvedLocation =
        typeof primaryLocation === 'string' && primaryLocation.trim()
          ? primaryLocation.trim()
          : 'Lahore';

      // 5. Save captain profile
      const record = await SupabaseRepo.upsertCaptainProfile({
        userId,
        teamName: teamName.trim(),
        sports: sports as Sport[],
        skillLevel: resolvedSkill as SkillLevel,
        primaryLocation: resolvedLocation,
      });

      // 6. Mark onboarding complete in public.profiles
      const updatedProfile = await SupabaseRepo.setOnboardingCompleted(userId, true);

      res.status(200).json({
        success: true,
        profile: {
          userId: record.user_id,
          teamName: record.team_name,
          sports: record.sports,
          skillLevel: record.skill_level,
          primaryLocation: record.primary_location,
        },
        user: updatedProfile
          ? {
              id: updatedProfile.id,
              name: updatedProfile.name,
              email: updatedProfile.email,
              role: updatedProfile.role,
              onboardingCompleted: updatedProfile.onboarding_completed,
            }
          : undefined,
      });
    } catch (error) {
      console.error('[ProfileController.updateCaptainProfile] Error:', error);
      res.status(500).json({ error: 'Failed to save captain profile.' });
    }
  },

  /**
   * Save or update Hub Owner profile.
   * Protected by authorizeRoles('HUB_OWNER').
   * IDOR protection: Strictly uses req.auth.userId.
   * Server strictly forces is_verified = false.
   */
  async updateHubOwnerProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const { hubName, location, courtsCount, courtCount, contactNumber, sports } = req.body;

      // 1. Validate hub name
      if (!hubName || typeof hubName !== 'string' || hubName.trim().length < 2) {
        res.status(400).json({
          error: 'Hub name is required and must be at least 2 characters.',
        });
        return;
      }

      // 2. Validate location
      if (!location || typeof location !== 'string' || location.trim().length < 2) {
        res.status(400).json({
          error: 'Hub location is required.',
        });
        return;
      }

      // 3. Validate court count
      const count = Number(courtCount ?? courtsCount);
      if (isNaN(count) || count < 1) {
        res.status(400).json({
          error: 'Hub must declare at least 1 playing court or pitch.',
        });
        return;
      }

      // 4. Validate contact number
      if (!contactNumber || typeof contactNumber !== 'string' || contactNumber.trim().length < 7) {
        res.status(400).json({
          error: 'A valid contact phone number is required.',
        });
        return;
      }

      // 5. Validate sports if supplied
      if (Array.isArray(sports)) {
        const invalidSport = sports.find((s) => !VALID_SPORTS.includes(s));
        if (invalidSport) {
          res.status(400).json({
            error: `Invalid sport "${invalidSport}". Allowed sports: ${VALID_SPORTS.join(', ')}.`,
          });
          return;
        }
      }

      // 6. Save hub owner profile (is_verified is enforced false)
      const record = await SupabaseRepo.upsertHubOwnerProfile({
        userId,
        hubName: hubName.trim(),
        location: location.trim(),
        courtCount: count,
        contactNumber: contactNumber.trim(),
        sports: Array.isArray(sports) ? (sports as Sport[]) : [],
      });

      // 7. Mark onboarding complete in public.profiles
      const updatedProfile = await SupabaseRepo.setOnboardingCompleted(userId, true);

      res.status(200).json({
        success: true,
        profile: {
          userId: record.user_id,
          hubName: record.hub_name,
          location: record.location,
          courtsCount: record.court_count,
          contactNumber: record.contact_number,
          sports: record.sports,
          isVerified: record.is_verified,
        },
        user: updatedProfile
          ? {
              id: updatedProfile.id,
              name: updatedProfile.name,
              email: updatedProfile.email,
              role: updatedProfile.role,
              onboardingCompleted: updatedProfile.onboarding_completed,
            }
          : undefined,
      });
    } catch (error) {
      console.error('[ProfileController.updateHubOwnerProfile] Error:', error);
      res.status(500).json({ error: 'Failed to save hub owner profile.' });
    }
  },
};

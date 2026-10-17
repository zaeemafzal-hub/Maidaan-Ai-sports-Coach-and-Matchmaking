import { Request, Response } from 'express';
import { SupabaseRepo, Sport, SkillLevel, TeamMemberRole, TeamMemberStatus } from '../models/supabaseRepo.js';

const VALID_SPORTS: Sport[] = ['cricket', 'badminton', 'padel', 'football'];
const VALID_SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
const VALID_ROLES: TeamMemberRole[] = ['CAPTAIN', 'PLAYER', 'VICE_CAPTAIN'];
const VALID_STATUSES: TeamMemberStatus[] = ['ACTIVE', 'INACTIVE'];

export const TeamController = {
  /**
   * GET /api/captain/team
   * Retrieve the authenticated captain's team.
   */
  async getMyTeam(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const team = await SupabaseRepo.getCaptainTeam(req.auth.userId);
      if (!team) {
        res.status(404).json({ error: 'No team registered for this captain.' });
        return;
      }

      res.status(200).json({ team });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to retrieve team.' });
    }
  },

  /**
   * POST /api/captain/team
   * Create a new team for the authenticated captain (only one team per captain).
   */
  async createTeam(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const captainId = req.auth.userId;
      const { name, sport, skillLevel, area } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 60) {
        res.status(400).json({ error: 'Team name is required and must be between 3 and 60 characters.' });
        return;
      }

      if (!sport || !VALID_SPORTS.includes(sport as Sport)) {
        res.status(400).json({ error: `Invalid sport "${sport}". Allowed: ${VALID_SPORTS.join(', ')}.` });
        return;
      }

      if (!skillLevel || !VALID_SKILL_LEVELS.includes(skillLevel as SkillLevel)) {
        res.status(400).json({ error: `Invalid skill level. Allowed: ${VALID_SKILL_LEVELS.join(', ')}.` });
        return;
      }

      if (!area || typeof area !== 'string' || area.trim().length < 2) {
        res.status(400).json({ error: 'Area/neighborhood is required.' });
        return;
      }

      const team = await SupabaseRepo.createTeam({
        captainId,
        name: name.trim(),
        sport: sport as Sport,
        skillLevel: skillLevel as SkillLevel,
        area: area.trim(),
      });

      res.status(201).json({ team, message: 'Team created successfully.' });
    } catch (err: any) {
      const msg = err?.message || 'Failed to create team.';
      if (msg.includes('already has a registered team')) {
        res.status(400).json({ error: msg });
        return;
      }
      res.status(500).json({ error: msg });
    }
  },

  /**
   * PATCH /api/captain/team
   * Update the authenticated captain's team details.
   */
  async updateTeam(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const captainId = req.auth.userId;
      const team = await SupabaseRepo.getCaptainTeam(captainId);
      if (!team) {
        res.status(404).json({ error: 'Team not found for this captain.' });
        return;
      }

      const { name, sport, skillLevel, area } = req.body;
      const updateData: Partial<{ name: string; sport: Sport; skillLevel: SkillLevel; area: string }> = {};

      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 60) {
          res.status(400).json({ error: 'Team name must be between 3 and 60 characters.' });
          return;
        }
        updateData.name = name.trim();
      }

      if (sport !== undefined) {
        if (!VALID_SPORTS.includes(sport as Sport)) {
          res.status(400).json({ error: `Invalid sport "${sport}". Allowed: ${VALID_SPORTS.join(', ')}.` });
          return;
        }
        updateData.sport = sport as Sport;
      }

      if (skillLevel !== undefined) {
        if (!VALID_SKILL_LEVELS.includes(skillLevel as SkillLevel)) {
          res.status(400).json({ error: `Invalid skill level. Allowed: ${VALID_SKILL_LEVELS.join(', ')}.` });
          return;
        }
        updateData.skillLevel = skillLevel as SkillLevel;
      }

      if (area !== undefined) {
        if (typeof area !== 'string' || area.trim().length < 2) {
          res.status(400).json({ error: 'Area/neighborhood is required.' });
          return;
        }
        updateData.area = area.trim();
      }

      const updated = await SupabaseRepo.updateTeam(team.id, captainId, updateData);
      res.status(200).json({ team: updated, message: 'Team updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update team.' });
    }
  },

  /**
   * GET /api/captain/team/members
   * Retrieve roster members for the authenticated captain's team.
   */
  async getTeamMembers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const captainId = req.auth.userId;
      const team = await SupabaseRepo.getCaptainTeam(captainId);
      if (!team) {
        res.status(404).json({ error: 'Team not found for this captain.' });
        return;
      }

      const members = await SupabaseRepo.getTeamMembers(team.id);
      res.status(200).json({ members });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch team members.' });
    }
  },

  /**
   * POST /api/captain/team/members
   * Add a member to the authenticated captain's team roster.
   */
  async addTeamMember(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const captainId = req.auth.userId;
      const team = await SupabaseRepo.getCaptainTeam(captainId);
      if (!team) {
        res.status(404).json({ error: 'Team not found for this captain.' });
        return;
      }

      const { userId, memberRole, status } = req.body;

      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        res.status(400).json({ error: 'userId is required.' });
        return;
      }

      if (memberRole && !VALID_ROLES.includes(memberRole as TeamMemberRole)) {
        res.status(400).json({ error: `Invalid memberRole. Allowed: ${VALID_ROLES.join(', ')}.` });
        return;
      }

      if (status && !VALID_STATUSES.includes(status as TeamMemberStatus)) {
        res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}.` });
        return;
      }

      const member = await SupabaseRepo.addTeamMember(team.id, captainId, {
        userId: userId.trim(),
        memberRole: memberRole as TeamMemberRole | undefined,
        status: status as TeamMemberStatus | undefined,
      });

      res.status(201).json({ member, message: 'Team member added successfully.' });
    } catch (err: any) {
      const msg = err?.message || 'Failed to add team member.';
      if (
        msg.includes('already an active member') ||
        msg.includes('Target user does not exist') ||
        msg.includes('already the primary owner') ||
        msg.includes('multiple primary captains') ||
        msg.includes('PLAYER capability') ||
        msg.includes('not found')
      ) {
        res.status(400).json({ error: msg });
        return;
      }
      res.status(500).json({ error: msg });
    }
  },

  /**
   * DELETE /api/captain/team/members/:userId
   * Remove a member from the authenticated captain's team roster.
   */
  async removeTeamMember(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const captainId = req.auth.userId;
      const team = await SupabaseRepo.getCaptainTeam(captainId);
      if (!team) {
        res.status(404).json({ error: 'Team not found for this captain.' });
        return;
      }

      const targetUserId = req.params.userId;
      if (!targetUserId) {
        res.status(400).json({ error: 'userId parameter is required.' });
        return;
      }

      await SupabaseRepo.removeTeamMember(team.id, captainId, targetUserId);
      res.status(200).json({ message: 'Team member removed successfully.' });
    } catch (err: any) {
      const msg = err?.message || 'Failed to remove team member.';
      if (msg.includes('Captain cannot remove themselves')) {
        res.status(400).json({ error: msg });
        return;
      }
      res.status(500).json({ error: msg });
    }
  },
};

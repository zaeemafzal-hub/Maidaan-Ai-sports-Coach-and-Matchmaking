import { validateFutureSchedule } from '../utils/schedule.js';
import { Request, Response } from 'express';
import { SupabaseRepo, Sport, SkillLevel } from '../models/supabaseRepo.js';

const VALID_SPORTS: Sport[] = ['cricket', 'badminton', 'padel', 'football'];
const VALID_SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

export const MatchController = {
  /**
   * POST /api/matches
   * Only TEAM_CAPTAIN can create matches.
   * Captain identity strictly extracted from req.auth.userId.
   */
  async createMatch(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const captainId = req.auth.userId;
      const {
        sport,
        title,
        format,
        date,
        startTime,
        venueName,
        area,
        skillLevel,
        totalCapacity,
        openSlots,
        contributionPerPlayer,
        notes,
        mapPosition,
        schematicMapPosition,
      } = req.body;

      // 1. Validate sport
      if (!sport || !VALID_SPORTS.includes(sport as Sport)) {
        res.status(400).json({
          error: `Invalid sport "${sport}". Allowed: cricket, badminton, padel, football.`,
        });
        return;
      }

      // 2. Validate title (4 to 100 chars)
      if (!title || typeof title !== 'string' || title.trim().length < 4 || title.trim().length > 100) {
        res.status(400).json({
          error: 'Match title is required and must be between 4 and 100 characters.',
        });
        return;
      }

      // 3. Validate venue name & area
      if (!venueName || typeof venueName !== 'string' || venueName.trim().length < 2) {
        res.status(400).json({ error: 'Venue name is required.' });
        return;
      }

      if (!area || typeof area !== 'string' || area.trim().length < 2) {
        res.status(400).json({ error: 'Area/neighborhood is required.' });
        return;
      }

      // 4. Validate skill level
      if (!skillLevel || !VALID_SKILL_LEVELS.includes(skillLevel as SkillLevel)) {
        res.status(400).json({
          error: `Invalid skill level. Allowed: ${VALID_SKILL_LEVELS.join(', ')}.`,
        });
        return;
      }

      // 5. Validate capacity constraints
      const capacityNum = Number(totalCapacity);
      if (!Number.isInteger(capacityNum) || capacityNum < 2 || capacityNum > 30) {
        res.status(400).json({
          error: 'Total capacity must be a number between 2 and 30.',
        });
        return;
      }

      const slotsNum = Number(openSlots);
      if (!Number.isInteger(slotsNum) || slotsNum < 0 || slotsNum > capacityNum) {
        res.status(400).json({
          error: 'Open slots must be between 0 and total capacity.',
        });
        return;
      }

      // 6. Validate date and time
      if (!date || typeof date !== 'string' || !date.trim()) {
        res.status(400).json({ error: 'Match date is required.' });
        return;
      }

      if (!startTime || typeof startTime !== 'string' || !startTime.trim()) {
        res.status(400).json({ error: 'Start time is required.' });
        return;
      }

      const scheduleError = validateFutureSchedule(date, startTime);
      if (scheduleError) { res.status(400).json({error: scheduleError}); return; }

      // 7. Validate contributionPerPlayer (informational only)
      let parsedContribution: number | null = null;
      if (contributionPerPlayer !== undefined && contributionPerPlayer !== null && contributionPerPlayer !== '') {
        const num = Number(contributionPerPlayer);
        if (isNaN(num) || num < 0) {
          res.status(400).json({ error: 'Contribution per player must be a non-negative number.' });
          return;
        }
        parsedContribution = num;
      }

      // 8. Validate notes
      if (notes && typeof notes === 'string' && notes.length > 300) {
        res.status(400).json({ error: 'Notes cannot exceed 300 characters.' });
        return;
      }

      // 9. Validate schematic map position
      const pos = schematicMapPosition || mapPosition;
      let normalizedPos: { x: number; y: number } | undefined = undefined;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        const x = Math.max(0, Math.min(100, pos.x));
        const y = Math.max(0, Math.min(100, pos.y));
        normalizedPos = { x, y };
      }

      // Validate team ownership if teamId is provided
      let validatedTeamId: string | undefined = undefined;
      if (req.body.teamId) {
        const teamIdToVerify = String(req.body.teamId).trim();
        const team = await SupabaseRepo.getTeamById(teamIdToVerify);
        if (!team || team.captainId !== captainId) {
          res.status(403).json({
            error: 'Specified team does not exist or does not belong to the authenticated captain.',
          });
          return;
        }
        validatedTeamId = teamIdToVerify;
      }

      // Create match in repository
      const match = await SupabaseRepo.createMatch({
        captainId,
        teamId: validatedTeamId,
        sport: sport as Sport,
        title: title.trim(),
        format: format ? format.trim() : undefined,
        date: date.trim(),
        startTime: startTime.trim(),
        venueName: venueName.trim(),
        area: area.trim(),
        skillLevel: skillLevel as SkillLevel,
        totalCapacity: capacityNum,
        openSlots: slotsNum,
        contributionPerPlayer: parsedContribution,
        notes: notes ? notes.trim() : undefined,
        mapPosition: normalizedPos,
      });

      res.status(201).json(match);
    } catch (error) {
      console.error('[MatchController.createMatch] Error:', error);
      res.status(500).json({ error: 'Failed to create match fixture.' });
    }
  },

  /**
   * GET /api/matches
   * Discover fixtures with optional filters.
   */
  async getMatches(req: Request, res: Response): Promise<void> {
    try {
      const sport = req.query.sport as Sport | undefined;
      const area = req.query.area as string | undefined;
      const skillLevel = req.query.skillLevel as SkillLevel | undefined;

      const filters: any = {};
      if (sport && VALID_SPORTS.includes(sport)) {
        filters.sport = sport;
      }
      if (area && typeof area === 'string') {
        filters.area = area.trim();
      }
      if (skillLevel && VALID_SKILL_LEVELS.includes(skillLevel)) {
        filters.skillLevel = skillLevel;
      }

      const matches = await SupabaseRepo.getMatches(filters);
      res.status(200).json({ matches });
    } catch (error) {
      console.error('[MatchController.getMatches] Error:', error);
      res.status(500).json({ error: 'Failed to load matches.' });
    }
  },

  /**
   * GET /api/matches/:id
   * Get single fixture details. Returns 404 if not found.
   */
  async getMatchById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Match ID is required.' });
        return;
      }

      const match = await SupabaseRepo.getMatchById(id);
      if (!match) {
        res.status(404).json({ error: 'Match fixture not found.' });
        return;
      }

      res.status(200).json(match);
    } catch (error) {
      console.error('[MatchController.getMatchById] Error:', error);
      res.status(500).json({ error: 'Failed to load match details.' });
    }
  },

  /**
   * GET /api/captain/matches
   * Retrieve matches owned by the authenticated team captain.
   * IDOR protected: strictly uses req.auth.userId.
   */
  async getCaptainMatches(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const captainId = req.auth.userId;
      const matches = await SupabaseRepo.getCaptainMatches(captainId);
      res.status(200).json({ matches });
    } catch (error) {
      console.error('[MatchController.getCaptainMatches] Error:', error);
      res.status(500).json({ error: 'Failed to load captain matches.' });
    }
  },

  /**
   * PATCH /api/captain/matches/:id/recruitment
   * Only TEAM_CAPTAIN who owns the match can update recruitment.
   */
  async updateRecruitment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const captainId = req.auth.userId;
      const matchId = req.params.id;
      const { openSlots } = req.body;

      if (openSlots === undefined || openSlots === null || isNaN(Number(openSlots))) {
        res.status(400).json({ error: 'openSlots is required and must be a valid number.' });
        return;
      }

      const match = await SupabaseRepo.updateMatchRecruitment(matchId, captainId, Number(openSlots));
      res.status(200).json({
        match,
        message: Number(openSlots) === 0 ? 'Recruitment closed.' : `Recruitment updated to ${openSlots} open slot(s).`,
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to update match recruitment.';
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
        return;
      }
      if (msg.includes('Only the match captain')) {
        res.status(403).json({ error: msg });
        return;
      }
      res.status(400).json({ error: msg });
    }
  },
};

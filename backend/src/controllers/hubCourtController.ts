import { Request, Response } from 'express';
import { SupabaseRepo, Sport, CourtStatus } from '../models/supabaseRepo.js';

const VALID_SPORTS: Sport[] = ['cricket', 'badminton', 'padel', 'football'];
const VALID_STATUSES: CourtStatus[] = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE'];

export const HubCourtController = {
  /**
   * GET /api/hub/courts
   * List all courts owned by the authenticated HUB_OWNER.
   */
  async getOwnerCourts(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;

      // Verify prerequisite hub profile exists
      const hubProfile = await SupabaseRepo.getHubOwnerProfile(userId);
      if (!hubProfile) {
        res.status(400).json({
          error: 'Hub setup incomplete. Hub profile is required before viewing courts.',
        });
        return;
      }

      const courts = await SupabaseRepo.getHubCourtsByOwner(userId);

      res.status(200).json({
        courts: courts.map((c) => ({
          id: c.id,
          name: c.name,
          sport: c.sport,
          status: c.status,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      });
    } catch (err: any) {
      console.error('[HubCourtController.getOwnerCourts] Error:', err);
      res.status(500).json({ error: 'Unable to process court request.' });
    }
  },

  /**
   * POST /api/hub/courts
   * Create a new court for the authenticated HUB_OWNER.
   */
  async createCourt(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;

      // 1. Verify prerequisite hub profile exists
      const hubProfile = await SupabaseRepo.getHubOwnerProfile(userId);
      if (!hubProfile) {
        res.status(400).json({
          error: 'Hub setup incomplete. Hub profile is required before registering courts.',
        });
        return;
      }

      const { name, sport, status, price, hourly_rate, price_per_hour, booking } = req.body;

      // 2. Reject booking and payment domain fields
      if (
        price !== undefined ||
        hourly_rate !== undefined ||
        price_per_hour !== undefined ||
        booking !== undefined
      ) {
        res.status(400).json({
          error: 'Booking and payment fields are not supported in facility court management.',
        });
        return;
      }

      // 3. Validate court name
      if (
        !name ||
        typeof name !== 'string' ||
        name.trim().length === 0 ||
        name.trim().length > 80
      ) {
        res.status(400).json({
          error: 'Court name is required, must not be empty, and must not exceed 80 characters.',
        });
        return;
      }

      // 4. Validate sport
      if (!sport || !VALID_SPORTS.includes(sport as Sport)) {
        res.status(400).json({
          error: `Invalid sport "${sport}". Allowed sports: cricket, badminton, padel, football.`,
        });
        return;
      }

      // 5. Validate status (defaults to AVAILABLE if omitted)
      let resolvedStatus: CourtStatus = 'AVAILABLE';
      if (status !== undefined && status !== null) {
        if (!VALID_STATUSES.includes(status as CourtStatus)) {
          res.status(400).json({
            error: `Invalid status "${status}". Allowed values: AVAILABLE, LIMITED, UNAVAILABLE.`,
          });
          return;
        }
        resolvedStatus = status as CourtStatus;
      }

      const trimmedName = name.trim();

      // 6. Check for duplicate court name under the same Hub Owner
      const duplicate = await SupabaseRepo.getHubCourtByOwnerAndName(userId, trimmedName);
      if (duplicate) {
        res.status(409).json({
          error: `A court with the name "${trimmedName}" already exists for this hub.`,
        });
        return;
      }

      // 7. Persist court
      const created = await SupabaseRepo.createHubCourt({
        hubOwnerId: userId,
        name: trimmedName,
        sport: sport as Sport,
        status: resolvedStatus,
      });

      res.status(201).json({
        court: {
          id: created.id,
          name: created.name,
          sport: created.sport,
          status: created.status,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      });
    } catch (err: any) {
      console.error('[HubCourtController.createCourt] Error:', err);
      res.status(500).json({ error: 'Unable to process court request.' });
    }
  },

  /**
   * PATCH /api/hub/courts/:id
   * Update mutable fields of an owned court.
   */
  async updateCourt(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const courtId = req.params.id;

      if (!courtId) {
        res.status(400).json({ error: 'Court ID is required.' });
        return;
      }

      // 1. Verify existence and ownership
      const court = await SupabaseRepo.getHubCourtById(courtId);
      if (!court) {
        res.status(404).json({ error: 'Court not found.' });
        return;
      }

      if (court.hubOwnerId !== userId) {
        res.status(403).json({ error: 'Forbidden: You do not own this court.' });
        return;
      }

      const {
        name,
        sport,
        status,
        hub_owner_id,
        hubOwnerId,
        price,
        hourly_rate,
        price_per_hour,
      } = req.body;

      // 2. Reject attempts to alter court ownership or inject booking fields
      if (
        (hub_owner_id && hub_owner_id !== userId) ||
        (hubOwnerId && hubOwnerId !== userId)
      ) {
        res.status(400).json({ error: 'Modifying court ownership is not permitted.' });
        return;
      }

      if (
        price !== undefined ||
        hourly_rate !== undefined ||
        price_per_hour !== undefined
      ) {
        res.status(400).json({
          error: 'Booking and payment fields are not supported in facility court management.',
        });
        return;
      }

      let updateName: string | undefined = undefined;
      let updateSport: Sport | undefined = undefined;
      let updateStatus: CourtStatus | undefined = undefined;

      // 3. Validate name update
      if (name !== undefined) {
        if (
          typeof name !== 'string' ||
          name.trim().length === 0 ||
          name.trim().length > 80
        ) {
          res.status(400).json({
            error: 'Court name must not be empty and must not exceed 80 characters.',
          });
          return;
        }

        const trimmed = name.trim();
        if (trimmed.toLowerCase() !== court.name.toLowerCase()) {
          const duplicate = await SupabaseRepo.getHubCourtByOwnerAndName(userId, trimmed);
          if (duplicate && duplicate.id !== court.id) {
            res.status(409).json({
              error: `A court with the name "${trimmed}" already exists for this hub.`,
            });
            return;
          }
        }
        updateName = trimmed;
      }

      // 4. Validate sport update
      if (sport !== undefined) {
        if (!VALID_SPORTS.includes(sport as Sport)) {
          res.status(400).json({
            error: `Invalid sport "${sport}". Allowed sports: cricket, badminton, padel, football.`,
          });
          return;
        }
        updateSport = sport as Sport;
      }

      // 5. Validate status update
      if (status !== undefined) {
        if (!VALID_STATUSES.includes(status as CourtStatus)) {
          res.status(400).json({
            error: `Invalid status "${status}". Allowed values: AVAILABLE, LIMITED, UNAVAILABLE.`,
          });
          return;
        }
        updateStatus = status as CourtStatus;
      }

      if (
        updateName === undefined &&
        updateSport === undefined &&
        updateStatus === undefined
      ) {
        res.status(400).json({ error: 'No valid update fields provided.' });
        return;
      }

      // 6. Apply updates
      const updated = await SupabaseRepo.updateHubCourt(courtId, {
        name: updateName,
        sport: updateSport,
        status: updateStatus,
      });

      res.status(200).json({
        court: {
          id: updated.id,
          name: updated.name,
          sport: updated.sport,
          status: updated.status,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (err: any) {
      console.error('[HubCourtController.updateCourt] Error:', err);
      res.status(500).json({ error: 'Unable to process court request.' });
    }
  },

  /**
   * DELETE /api/hub/courts/:id
   * Delete an owned court and re-synchronize court count.
   */
  async deleteCourt(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const courtId = req.params.id;

      if (!courtId) {
        res.status(400).json({ error: 'Court ID is required.' });
        return;
      }

      // 1. Verify existence and ownership
      const court = await SupabaseRepo.getHubCourtById(courtId);
      if (!court) {
        res.status(404).json({ error: 'Court not found.' });
        return;
      }

      if (court.hubOwnerId !== userId) {
        res.status(403).json({ error: 'Forbidden: You do not own this court.' });
        return;
      }

      // 2. Delete court
      await SupabaseRepo.deleteHubCourt(courtId, userId);

      res.status(200).json({
        success: true,
        message: 'Court deleted successfully.',
      });
    } catch (err: any) {
      console.error('[HubCourtController.deleteCourt] Error:', err);
      res.status(500).json({ error: 'Unable to process court request.' });
    }
  },
};

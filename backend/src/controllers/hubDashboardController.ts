import { Request, Response } from 'express';
import { SupabaseRepo, Sport } from '../models/supabaseRepo.js';

const VALID_SPORTS: Sport[] = ['cricket', 'badminton', 'padel', 'football'];

export const HubDashboardController = {
  /**
   * GET /api/hub/dashboard
   * Fetch aggregated summary for the authenticated Hub Owner:
   * venue metadata, verification status, and court counts breakdown.
   */
  async getDashboardSummary(req: Request, res: Response): Promise<void> {
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
          error: 'Hub setup incomplete. Hub profile is required before accessing dashboard.',
        });
        return;
      }

      // 2. Compute aggregated summary
      const summary = await SupabaseRepo.getHubDashboardSummary(userId);

      res.status(200).json(summary);
    } catch (err: any) {
      console.error('[HubDashboardController.getDashboardSummary] Error:', err);
      res.status(500).json({ error: 'Unable to load hub dashboard summary.' });
    }
  },

  /**
   * GET /api/hub/profile
   * Fetch the authenticated Hub Owner's venue profile.
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;

      const hubProfile = await SupabaseRepo.getHubOwnerProfile(userId);
      if (!hubProfile) {
        res.status(404).json({
          error: 'Hub owner profile not found.',
        });
        return;
      }

      res.status(200).json({
        profile: {
          userId: hubProfile.user_id,
          hubName: hubProfile.hub_name,
          contactNumber: hubProfile.contact_number || null,
          sports: hubProfile.sports,
          location: hubProfile.location,
          courtCount: hubProfile.court_count,
          isVerified: hubProfile.is_verified,
          createdAt: hubProfile.created_at,
          updatedAt: hubProfile.updated_at,
        },
      });
    } catch (err: any) {
      console.error('[HubDashboardController.getProfile] Error:', err);
      res.status(500).json({ error: 'Unable to retrieve hub profile.' });
    }
  },

  /**
   * PATCH /api/hub/profile
   * Update mutable venue fields (hubName, contactNumber, sports, location).
   * Note: is_verified and court_count cannot be altered by client request.
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;

      // Check if client tried to manipulate another owner's profile
      if (req.body.userId && req.body.userId !== userId) {
        res.status(403).json({ error: 'Forbidden: You cannot modify another owner venue profile.' });
        return;
      }
      if (req.body.user_id && req.body.user_id !== userId) {
        res.status(403).json({ error: 'Forbidden: You cannot modify another owner venue profile.' });
        return;
      }

      const hubProfile = await SupabaseRepo.getHubOwnerProfile(userId);
      if (!hubProfile) {
        res.status(404).json({
          error: 'Hub owner profile not found.',
        });
        return;
      }

      const { hubName, name, contactNumber, sports, location } = req.body;

      const resolvedName = hubName !== undefined ? hubName : name;

      // 1. Validate name if provided
      if (resolvedName !== undefined) {
        if (
          typeof resolvedName !== 'string' ||
          resolvedName.trim().length === 0 ||
          resolvedName.trim().length > 100
        ) {
          res.status(400).json({
            error: 'Hub name must be a non-empty string not exceeding 100 characters.',
          });
          return;
        }
      }

      // 2. Validate location if provided
      if (location !== undefined) {
        if (
          typeof location !== 'string' ||
          location.trim().length === 0 ||
          location.trim().length > 200
        ) {
          res.status(400).json({
            error: 'Location must be a non-empty string not exceeding 200 characters.',
          });
          return;
        }
      }

      // 3. Validate sports if provided
      if (sports !== undefined) {
        if (!Array.isArray(sports) || sports.length === 0) {
          res.status(400).json({
            error: 'Sports must be a non-empty array of supported sports.',
          });
          return;
        }
        for (const s of sports) {
          if (!VALID_SPORTS.includes(s as Sport)) {
            res.status(400).json({
              error: `Invalid sport "${s}". Supported sports: ${VALID_SPORTS.join(', ')}.`,
            });
            return;
          }
        }
      }

      // 4. Validate contactNumber if provided
      if (contactNumber !== undefined && contactNumber !== null) {
        if (typeof contactNumber !== 'string') {
          res.status(400).json({
            error: 'Contact number must be a valid string.',
          });
          return;
        }
      }

      // 5. Update profile (is_verified is preserved inside repo)
      const updated = await SupabaseRepo.updateHubOwnerProfile(userId, {
        hubName: resolvedName,
        contactNumber,
        sports: sports as Sport[] | undefined,
        location,
      });

      res.status(200).json({
        profile: {
          userId: updated.user_id,
          hubName: updated.hub_name,
          contactNumber: updated.contact_number || null,
          sports: updated.sports,
          location: updated.location,
          courtCount: updated.court_count,
          isVerified: updated.is_verified,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        },
      });
    } catch (err: any) {
      console.error('[HubDashboardController.updateProfile] Error:', err);
      res.status(500).json({ error: 'Unable to update hub profile.' });
    }
  },
};

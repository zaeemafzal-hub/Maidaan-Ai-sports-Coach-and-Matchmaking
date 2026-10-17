import { Request, Response } from 'express';
import { SupabaseRepo } from '../models/supabaseRepo.js';

export const HubVerificationController = {
  /**
   * POST /api/hub/verification-request
   * Submit a new verification request for the authenticated HUB_OWNER.
   */
  async submitVerificationRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const hubOwnerId = req.auth.userId;

      // 1. Verify prerequisite Hub Owner profile exists
      const hubProfile = await SupabaseRepo.getHubOwnerProfile(hubOwnerId);
      if (!hubProfile) {
        res.status(400).json({
          error: 'Hub setup incomplete. Hub profile is required before requesting verification.',
        });
        return;
      }

      // 2. Reject duplicate submission if already verified
      if (hubProfile.is_verified) {
        res.status(409).json({
          error: 'This Hub is already verified. Duplicate verification submission rejected.',
        });
        return;
      }

      // 3. Reject duplicate submission if there is already an active PENDING request
      const activePending = await SupabaseRepo.getPendingHubVerificationRequestByOwner(hubOwnerId);
      if (activePending) {
        res.status(409).json({
          error: 'An active verification request is already pending review.',
        });
        return;
      }

      // 4. Create new verification request with status PENDING
      const request = await SupabaseRepo.createHubVerificationRequest(hubOwnerId);

      res.status(201).json({
        id: request.id,
        hubOwnerId: request.hubOwnerId,
        status: request.status,
        submittedAt: request.submittedAt,
        reviewedAt: request.reviewedAt,
        adminNote: request.adminNote,
      });
    } catch (err: any) {
      console.error('[HubVerificationController.submitVerificationRequest] Error:', err);
      res.status(500).json({ error: 'Unable to process verification request.' });
    }
  },

  /**
   * GET /api/hub/verification
   * Get latest verification status for the authenticated HUB_OWNER.
   */
  async getVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const hubOwnerId = req.auth.userId;

      const hubProfile = await SupabaseRepo.getHubOwnerProfile(hubOwnerId);
      if (!hubProfile) {
        res.status(400).json({
          error: 'Hub setup incomplete. Hub profile is required before viewing verification status.',
        });
        return;
      }

      const latest = await SupabaseRepo.getLatestHubVerificationRequestByOwner(hubOwnerId);

      if (!latest) {
        res.status(200).json({
          status: 'NOT_SUBMITTED',
          adminNote: null,
          submittedAt: null,
          reviewedAt: null,
          isVerified: hubProfile.is_verified,
        });
        return;
      }

      res.status(200).json({
        id: latest.id,
        hubOwnerId: latest.hubOwnerId,
        status: latest.status,
        submittedAt: latest.submittedAt,
        reviewedAt: latest.reviewedAt,
        adminNote: latest.adminNote,
        isVerified: hubProfile.is_verified,
      });
    } catch (err: any) {
      console.error('[HubVerificationController.getVerificationStatus] Error:', err);
      res.status(500).json({ error: 'Unable to process verification status request.' });
    }
  },
};

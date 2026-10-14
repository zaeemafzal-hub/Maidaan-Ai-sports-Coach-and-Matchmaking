import { Request, Response } from 'express';
import { SupabaseRepo } from '../models/supabaseRepo.js';

export const JoinRequestController = {
  /**
   * POST /api/matches/:id/join
   * Player requests to join a match slot.
   * Only PLAYER role allowed.
   */
  async createJoinRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const matchId = req.params.id;
      const playerId = req.auth.userId;

      if (!matchId || typeof matchId !== 'string') {
        res.status(400).json({ error: 'Valid match ID is required in URL parameter.' });
        return;
      }

      // Check match exists
      const match = await SupabaseRepo.getMatchById(matchId);
      if (!match) {
        res.status(404).json({ error: 'Match fixture not found.' });
        return;
      }

      // Captain cannot request own match
      if (match.captainId === playerId) {
        res.status(409).json({ error: 'You are the captain of this match and cannot join via request.' });
        return;
      }

      // Check match is not full
      if (match.openSlots <= 0 || match.status === 'FULL') {
        res.status(409).json({ error: 'Match is already full. No open slots remaining.' });
        return;
      }

      // Check player is not already confirmed participant
      const isParticipant = await SupabaseRepo.isMatchParticipant(matchId, playerId);
      if (isParticipant) {
        res.status(409).json({ error: 'You are already a confirmed participant in this match.' });
        return;
      }

      // Check player does not already have a join request
      const existingReq = await SupabaseRepo.getPlayerActiveRequestForMatch(matchId, playerId);
      if (existingReq) {
        res.status(409).json({
          error: `You already submitted a request for this match (Status: ${existingReq.status}). Duplicate requests are not permitted.`,
        });
        return;
      }

      // Validate message length if provided (max 300 chars)
      const rawMessage = req.body?.message;
      if (rawMessage && (typeof rawMessage !== 'string' || rawMessage.length > 300)) {
        res.status(400).json({ error: 'Message cannot exceed 300 characters.' });
        return;
      }

      const newRequest = await SupabaseRepo.createJoinRequest({
        matchId,
        playerId,
        message: rawMessage || null,
      });

      // EVENT 1: Notify Captain of new join request
      try {
        const playerProfile = await SupabaseRepo.getProfile(playerId);
        const playerName = playerProfile?.name || 'A player';
        await SupabaseRepo.createNotification({
          userId: match.captainId,
          type: 'JOIN_REQUEST_RECEIVED',
          title: 'NEW JOIN REQUEST',
          message: `${playerName} requested a slot for ${match.title}.`,
          matchId: match.id,
          joinRequestId: newRequest.id,
        });
      } catch (notifErr) {
        console.warn('[JoinRequestController] Failed to create captain notification:', notifErr);
      }

      res.status(201).json({
        id: newRequest.id,
        matchId: newRequest.matchId,
        playerId: newRequest.playerId,
        status: newRequest.status,
        message: newRequest.message,
        createdAt: newRequest.createdAt,
        updatedAt: newRequest.updatedAt,
      });
    } catch (err: any) {
      console.error('[JoinRequestController.createJoinRequest] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while creating join request.' });
    }
  },

  /**
   * GET /api/join-requests/me
   * Retrieve current player's join requests with fixture summary.
   */
  async getMyRequests(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const playerId = req.auth.userId;
      const requests = await SupabaseRepo.getPlayerJoinRequests(playerId);

      res.json({ requests });
    } catch (err: any) {
      console.error('[JoinRequestController.getMyRequests] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while fetching your requests.' });
    }
  },

  /**
   * GET /api/matches/:id/requests
   * Retrieve join requests for a specific match.
   * Only the owning TEAM_CAPTAIN can access.
   */
  async getMatchRequests(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const matchId = req.params.id;
      const captainId = req.auth.userId;

      const match = await SupabaseRepo.getMatchById(matchId);
      if (!match) {
        res.status(404).json({ error: 'Match fixture not found.' });
        return;
      }

      // Verify captain ownership
      if (match.captainId !== captainId) {
        res.status(403).json({ error: 'Access forbidden: You do not own this match fixture.' });
        return;
      }

      const requests = await SupabaseRepo.getMatchJoinRequests(matchId);
      res.json({ requests });
    } catch (err: any) {
      console.error('[JoinRequestController.getMatchRequests] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while fetching match requests.' });
    }
  },

  /**
   * PATCH /api/join-requests/:id
   * Captain accepts or rejects a join request.
   * Body: { action: "ACCEPT" | "REJECT" }
   */
  async updateRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const requestId = req.params.id;
      const captainId = req.auth.userId;
      const { action } = req.body;

      if (!action || (action !== 'ACCEPT' && action !== 'REJECT')) {
        res.status(400).json({ error: 'Invalid action. Allowed values are "ACCEPT" or "REJECT".' });
        return;
      }

      // Load request
      const existingReq = await SupabaseRepo.getJoinRequestById(requestId);
      if (!existingReq) {
        res.status(404).json({ error: 'Join request not found.' });
        return;
      }

      // Load match to verify ownership
      const match = await SupabaseRepo.getMatchById(existingReq.match_id);
      if (!match) {
        res.status(404).json({ error: 'Associated match fixture not found.' });
        return;
      }

      if (match.captainId !== captainId) {
        res.status(403).json({ error: 'Access forbidden: You do not own this match fixture.' });
        return;
      }

      if (action === 'REJECT') {
        const result = await SupabaseRepo.rejectJoinRequest(requestId, captainId);
        if (!result.success) {
          if (result.code === 'NOT_FOUND') {
            res.status(404).json({ error: result.error });
            return;
          }
          if (result.code === 'INVALID_STATUS') {
            res.status(409).json({ error: result.error });
            return;
          }
          if (result.code === 'FORBIDDEN') {
            res.status(403).json({ error: result.error });
            return;
          }
          res.status(500).json({ error: result.error || 'Failed to reject request.' });
          return;
        }

        // EVENT 3: Notify Player that request was rejected
        try {
          await SupabaseRepo.createNotification({
            userId: existingReq.player_id,
            type: 'JOIN_REQUEST_REJECTED',
            title: 'REQUEST UPDATE',
            message: `Your request for ${match.title} was not accepted.`,
            matchId: match.id,
            joinRequestId: existingReq.id,
          });
        } catch (notifErr) {
          console.warn('[JoinRequestController] Failed to create rejection notification:', notifErr);
        }

        res.json({
          request: result.request,
          message: 'Join request rejected.',
        });
        return;
      }

      // action === 'ACCEPT' (Atomic)
      const result = await SupabaseRepo.acceptJoinRequest(requestId, captainId);
      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          res.status(404).json({ error: result.error });
          return;
        }
        if (result.code === 'INVALID_STATUS' || result.code === 'ALREADY_PARTICIPANT' || result.code === 'MATCH_FULL') {
          res.status(409).json({ error: result.error });
          return;
        }
        if (result.code === 'FORBIDDEN') {
          res.status(403).json({ error: result.error });
          return;
        }
        res.status(500).json({ error: result.error || 'Failed to accept request.' });
        return;
      }

      // EVENT 2: Notify Player that request was accepted
      try {
        await SupabaseRepo.createNotification({
          userId: existingReq.player_id,
          type: 'JOIN_REQUEST_ACCEPTED',
          title: 'SPOT CONFIRMED',
          message: `Your slot for ${match.title} has been confirmed. You are in the lineup!`,
          matchId: match.id,
          joinRequestId: existingReq.id,
        });
      } catch (notifErr) {
        console.warn('[JoinRequestController] Failed to create acceptance notification:', notifErr);
      }

      res.json({
        request: result.request,
        openSlots: result.openSlots,
        matchStatus: result.matchStatus,
        message: 'Join request accepted and player confirmed.',
      });
    } catch (err: any) {
      console.error('[JoinRequestController.updateRequestStatus] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while processing request action.' });
    }
  },
};

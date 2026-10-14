import { Request, Response } from 'express';
import { SupabaseRepo, ReportCategory } from '../models/supabaseRepo.js';

const VALID_CATEGORIES: ReportCategory[] = [
  'CONDUCT',
  'HARASSMENT',
  'UNSAFE_BEHAVIOR',
  'SPAM',
  'OTHER',
];

export const ReportController = {
  /**
   * POST /api/reports
   * Submit a new community report against a user and/or match.
   */
  async createReport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const reporterId = req.auth.userId;
      const role = req.auth.role;

      // Restrict ordinary report submission: Admins review reports, they do not file them here
      if (role === 'ADMIN') {
        res.status(403).json({
          error: 'Administrator accounts may not submit community reports.',
        });
        return;
      }

      const { category, description, reportedUserId, matchId } = req.body || {};

      // 1. Validate category
      if (!category || !VALID_CATEGORIES.includes(category as ReportCategory)) {
        res.status(400).json({
          error: `Invalid report category. Must be one of: ${VALID_CATEGORIES.join(', ')}.`,
        });
        return;
      }

      // 2. Validate description
      const trimmedDescription = typeof description === 'string' ? description.trim() : '';
      if (!trimmedDescription || trimmedDescription.length > 1000) {
        res.status(400).json({
          error: 'Description is required and cannot exceed 1000 characters.',
        });
        return;
      }

      // 3. Validate at least one target is provided
      const targetUserId =
        typeof reportedUserId === 'string' && reportedUserId.trim().length > 0
          ? reportedUserId.trim()
          : null;
      const targetMatchId =
        typeof matchId === 'string' && matchId.trim().length > 0
          ? matchId.trim()
          : null;

      if (!targetUserId && !targetMatchId) {
        res.status(400).json({
          error: 'At least one target (reported user or match) must be specified.',
        });
        return;
      }

      // 4. Validate existence of targets
      if (targetUserId) {
        const targetProfile = await SupabaseRepo.getProfile(targetUserId);
        if (!targetProfile) {
          res.status(404).json({
            error: 'Reported user profile not found.',
          });
          return;
        }
      }

      if (targetMatchId) {
        const targetMatch = await SupabaseRepo.getMatchById(targetMatchId);
        if (!targetMatch) {
          res.status(404).json({
            error: 'Reported match fixture not found.',
          });
          return;
        }
      }

      // 5. Create report with initial status OPEN
      const report = await SupabaseRepo.createReport({
        reporterId,
        reportedUserId: targetUserId,
        matchId: targetMatchId,
        category: category as ReportCategory,
        description: trimmedDescription,
      });

      res.status(201).json({
        id: report.id,
        reporterId: report.reporterId,
        reportedUserId: report.reportedUserId,
        matchId: report.matchId,
        category: report.category,
        description: report.description,
        status: report.status,
        adminNote: report.adminNote,
        reviewedBy: report.reviewedBy,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        resolvedAt: report.resolvedAt,
      });
    } catch (err: any) {
      console.error('[ReportController.createReport] Error:', err);
      res.status(500).json({ error: 'Unable to submit community report.' });
    }
  },
};

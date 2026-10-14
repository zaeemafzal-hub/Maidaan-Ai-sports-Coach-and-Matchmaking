import { Request, Response } from 'express';
import {
  SupabaseRepo,
  HubVerificationStatus,
  ReportCategory,
  ReportStatus,
} from '../models/supabaseRepo.js';

const VALID_VERIFICATION_STATUSES: HubVerificationStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
];

const VALID_REPORT_STATUSES: ReportStatus[] = [
  'OPEN',
  'RESOLVED',
  'DISMISSED',
  'FOLLOW_UP',
];

const VALID_REPORT_CATEGORIES: ReportCategory[] = [
  'CONDUCT',
  'HARASSMENT',
  'UNSAFE_BEHAVIOR',
  'SPAM',
  'OTHER',
];

export const AdminController = {
  /**
   * GET /api/admin/hub-verifications
   * List all hub verification requests with venue context, optionally filtered by status.
   */
  async getHubVerifications(req: Request, res: Response): Promise<void> {
    try {
      const statusQuery = req.query.status as string | undefined;
      let statusFilter: HubVerificationStatus | undefined = undefined;

      if (statusQuery) {
        const upper = statusQuery.toUpperCase() as HubVerificationStatus;
        if (!VALID_VERIFICATION_STATUSES.includes(upper)) {
          res.status(400).json({
            error: `Invalid status filter. Allowed: ${VALID_VERIFICATION_STATUSES.join(', ')}.`,
          });
          return;
        }
        statusFilter = upper;
      }

      const requests = await SupabaseRepo.getHubVerificationRequests({
        status: statusFilter,
      });

      res.status(200).json({ requests });
    } catch (err: any) {
      console.error('[AdminController.getHubVerifications] Error:', err);
      res.status(500).json({ error: 'Unable to retrieve verification requests.' });
    }
  },

  /**
   * GET /api/admin/hub-verifications/:id
   * Get single hub verification request with venue context.
   */
  async getHubVerificationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const request = await SupabaseRepo.getHubVerificationRequestById(id);

      if (!request) {
        res.status(404).json({ error: 'Verification request not found.' });
        return;
      }

      res.status(200).json({ request });
    } catch (err: any) {
      console.error('[AdminController.getHubVerificationById] Error:', err);
      res.status(500).json({ error: 'Unable to retrieve verification request.' });
    }
  },

  /**
   * PATCH /api/admin/hub-verifications/:id
   * Review a hub verification request (APPROVE or REJECT).
   */
  async reviewHubVerification(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const adminId = req.auth.userId;
      const { id } = req.params;
      const { action, adminNote } = req.body || {};

      // 1. Validate action
      if (action !== 'APPROVE' && action !== 'REJECT') {
        res.status(400).json({
          error: "Action must be either 'APPROVE' or 'REJECT'.",
        });
        return;
      }

      // 2. Validate admin note limit
      if (adminNote !== undefined && adminNote !== null) {
        if (typeof adminNote !== 'string' || adminNote.length > 300) {
          res.status(400).json({
            error: 'Admin note cannot exceed 300 characters.',
          });
          return;
        }
      }

      // 3. Check existing request
      const existing = await SupabaseRepo.getHubVerificationRequestById(id);
      if (!existing) {
        res.status(404).json({ error: 'Verification request not found.' });
        return;
      }

      // 4. Reject invalid transitions
      if (existing.status !== 'PENDING') {
        res.status(409).json({
          error: `Cannot review request with status '${existing.status}'. Only PENDING requests can be reviewed.`,
        });
        return;
      }

      // 5. Execute review
      const updated = await SupabaseRepo.reviewHubVerification({
        requestId: id,
        adminId,
        action,
        adminNote: adminNote ? adminNote.trim() : null,
      });

      res.status(200).json({ request: updated });
    } catch (err: any) {
      console.error('[AdminController.reviewHubVerification] Error:', err);
      res.status(500).json({ error: 'Unable to review verification request.' });
    }
  },

  /**
   * GET /api/admin/reports
   * List all community reports with reporter/target context, optionally filtered.
   */
  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const statusQuery = req.query.status as string | undefined;
      const categoryQuery = req.query.category as string | undefined;

      let statusFilter: ReportStatus | undefined = undefined;
      let categoryFilter: ReportCategory | undefined = undefined;

      if (statusQuery) {
        const upper = statusQuery.toUpperCase() as ReportStatus;
        if (!VALID_REPORT_STATUSES.includes(upper)) {
          res.status(400).json({
            error: `Invalid status filter. Allowed: ${VALID_REPORT_STATUSES.join(', ')}.`,
          });
          return;
        }
        statusFilter = upper;
      }

      if (categoryQuery) {
        const upper = categoryQuery.toUpperCase() as ReportCategory;
        if (!VALID_REPORT_CATEGORIES.includes(upper)) {
          res.status(400).json({
            error: `Invalid category filter. Allowed: ${VALID_REPORT_CATEGORIES.join(', ')}.`,
          });
          return;
        }
        categoryFilter = upper;
      }

      const reports = await SupabaseRepo.getReports({
        status: statusFilter,
        category: categoryFilter,
      });

      res.status(200).json({ reports });
    } catch (err: any) {
      console.error('[AdminController.getReports] Error:', err);
      res.status(500).json({ error: 'Unable to retrieve community reports.' });
    }
  },

  /**
   * GET /api/admin/reports/:id
   * Get single report with context.
   */
  async getReportById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const report = await SupabaseRepo.getReportById(id);

      if (!report) {
        res.status(404).json({ error: 'Report not found.' });
        return;
      }

      res.status(200).json({ report });
    } catch (err: any) {
      console.error('[AdminController.getReportById] Error:', err);
      res.status(500).json({ error: 'Unable to retrieve report.' });
    }
  },

  /**
   * PATCH /api/admin/reports/:id
   * Review a community report (RESOLVE, DISMISS, or FOLLOW_UP).
   */
  async reviewReport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const adminId = req.auth.userId;
      const { id } = req.params;
      const { action, adminNote } = req.body || {};

      // 1. Validate action
      if (action !== 'RESOLVE' && action !== 'DISMISS' && action !== 'FOLLOW_UP') {
        res.status(400).json({
          error: "Action must be one of: 'RESOLVE', 'DISMISS', 'FOLLOW_UP'.",
        });
        return;
      }

      // 2. Validate admin note limit
      if (adminNote !== undefined && adminNote !== null) {
        if (typeof adminNote !== 'string' || adminNote.length > 300) {
          res.status(400).json({
            error: 'Admin note cannot exceed 300 characters.',
          });
          return;
        }
      }

      // 3. Check existing report
      const existing = await SupabaseRepo.getReportById(id);
      if (!existing) {
        res.status(404).json({ error: 'Report not found.' });
        return;
      }

      // 4. Validate allowed transitions
      if (existing.status === 'OPEN') {
        // OPEN can transition to RESOLVED, DISMISSED, or FOLLOW_UP
      } else if (existing.status === 'FOLLOW_UP') {
        if (action !== 'RESOLVE' && action !== 'DISMISS') {
          res.status(409).json({
            error: "Report is already in 'FOLLOW_UP' status. Allowed actions are 'RESOLVE' or 'DISMISS'.",
          });
          return;
        }
      } else {
        res.status(409).json({
          error: `Cannot review report with status '${existing.status}'. Report is already finalized.`,
        });
        return;
      }

      // 5. Execute review
      const updated = await SupabaseRepo.reviewReport({
        reportId: id,
        adminId,
        action,
        adminNote: adminNote ? adminNote.trim() : null,
      });

      res.status(200).json({ report: updated });
    } catch (err: any) {
      console.error('[AdminController.reviewReport] Error:', err);
      res.status(500).json({ error: 'Unable to review report.' });
    }
  },
};

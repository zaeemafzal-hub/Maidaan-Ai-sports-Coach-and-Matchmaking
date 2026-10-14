import { Request, Response } from 'express';
import { SupabaseRepo } from '../models/supabaseRepo.js';

export const NotificationController = {
  /**
   * GET /api/notifications
   * Retrieve all in-app notifications for authenticated user, sorted by created_at DESC.
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const notifications = await SupabaseRepo.getUserNotifications(userId);

      res.json({ notifications });
    } catch (err: any) {
      console.error('[NotificationController.getNotifications] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while fetching notifications.' });
    }
  },

  /**
   * PATCH /api/notifications/:id/read
   * Mark a single notification as read.
   * Enforces IDOR check: user can only mark their own notifications.
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const notificationId = req.params.id;
      const userId = req.auth.userId;

      if (!notificationId) {
        res.status(400).json({ error: 'Notification ID is required.' });
        return;
      }

      const result = await SupabaseRepo.markNotificationAsRead(notificationId, userId);

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          res.status(404).json({ error: result.error });
          return;
        }
        if (result.code === 'FORBIDDEN') {
          res.status(403).json({ error: result.error });
          return;
        }
        res.status(500).json({ error: result.error || 'Failed to mark notification as read.' });
        return;
      }

      res.json({
        success: true,
        notification: result.notification,
      });
    } catch (err: any) {
      console.error('[NotificationController.markAsRead] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while marking notification as read.' });
    }
  },

  /**
   * PATCH /api/notifications/read-all
   * Mark all unread notifications for authenticated user as read.
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const userId = req.auth.userId;
      const result = await SupabaseRepo.markAllNotificationsAsRead(userId);

      res.json({
        success: true,
        updatedCount: result.updatedCount,
      });
    } catch (err: any) {
      console.error('[NotificationController.markAllAsRead] Internal error:', err);
      res.status(500).json({ error: 'Internal server error while marking all notifications as read.' });
    }
  },
};

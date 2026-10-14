import { Router } from 'express';
import { authenticateSupabaseUser } from '../middleware/auth.js';
import { NotificationController } from '../controllers/notificationController.js';

const router = Router();

// All notification endpoints require authentication
router.use(authenticateSupabaseUser);

// GET /api/notifications — Retrieve in-app notifications for authenticated user
router.get('/', NotificationController.getNotifications);

// PATCH /api/notifications/read-all — Mark all notifications as read
router.patch('/read-all', NotificationController.markAllAsRead);

// PATCH /api/notifications/:id/read — Mark single notification as read
router.patch('/:id/read', NotificationController.markAsRead);

export default router;

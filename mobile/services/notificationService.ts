import { api } from './api';

export type NotificationType =
  | 'JOIN_REQUEST_RECEIVED'
  | 'JOIN_REQUEST_ACCEPTED'
  | 'JOIN_REQUEST_REJECTED';

export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  matchId?: string | null;
  joinRequestId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  /**
   * GET /api/notifications
   * Fetch all notifications for current authenticated user.
   */
  async getNotifications(): Promise<InAppNotification[]> {
    const res = await api.get<{ notifications: InAppNotification[] }>('/api/notifications');

    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to fetch notifications.');
    }

    if (Array.isArray(res.data.notifications)) {
      return res.data.notifications;
    }

    return [];
  },

  /**
   * PATCH /api/notifications/:id/read
   * Mark a specific notification as read.
   */
  async markAsRead(id: string): Promise<InAppNotification> {
    const res = await api.patch<{ success: boolean; notification: InAppNotification }>(
      `/api/notifications/${id}/read`
    );

    if (res.error || !res.data || !res.data.notification) {
      throw new Error(res.error || 'Failed to mark notification as read.');
    }

    return res.data.notification;
  },

  /**
   * PATCH /api/notifications/read-all
   * Mark all unread notifications as read.
   */
  async markAllAsRead(): Promise<number> {
    const res = await api.patch<{ success: boolean; updatedCount: number }>(
      '/api/notifications/read-all'
    );

    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to mark all notifications as read.');
    }

    return res.data.updatedCount;
  },
};

import { api } from './api';

export type NotificationType =
  | 'MILESTONE_DUE_SOON'
  | 'MILESTONE_OVERDUE'
  | 'RELEASE_STATUS_CHANGED'
  | 'MILESTONE_STATUS_CHANGED'
  | 'MEMBER_ADDED';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreference {
  userId: string;
  milestoneDueSoonDays: number;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  notifyMilestoneDue: boolean;
  notifyMilestoneOverdue: boolean;
  notifyReleaseStatus: boolean;
  notifyMemberAdded: boolean;
}

export interface UpdatePreferencesPayload {
  milestoneDueSoonDays?: number;
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  notifyMilestoneDue?: boolean;
  notifyMilestoneOverdue?: boolean;
  notifyReleaseStatus?: boolean;
  notifyMemberAdded?: boolean;
}

const notificationsService = {
  getAll: (unread?: boolean) =>
    api.get<AppNotification[]>('/notifications', { params: unread ? { unread: 'true' } : {} })
      .then((r) => r.data),

  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.patch('/notifications/read-all').then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`).then((r) => r.data),

  getPreferences: () =>
    api.get<NotificationPreference>('/notifications/preferences').then((r) => r.data),

  updatePreferences: (payload: UpdatePreferencesPayload) =>
    api.patch<NotificationPreference>('/notifications/preferences', payload).then((r) => r.data),
};

export default notificationsService;

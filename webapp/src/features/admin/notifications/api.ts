import { api } from '@/lib/api'
import type { AppNotification, NotificationFeed } from './types'

/** Recent notifications + the unread count, for the open dropdown. */
export async function fetchNotifications(): Promise<NotificationFeed> {
  const { data } = await api.get<{ data: AppNotification[]; meta: { unread_count: number } }>('/notifications')
  return { items: data.data, unread_count: data.meta.unread_count }
}

/** Lightweight unread count, polled by the bell badge. */
export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<{ data: { count: number } }>('/notifications/unread-count')
  return data.data.count
}

/** Mark everything as seen (clears the badge). */
export async function markNotificationsSeen(): Promise<void> {
  await api.post('/notifications/seen')
}

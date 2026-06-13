export interface AppNotification {
  id: number
  action: string
  category: string
  title: string
  actor: string
  route: string
  created_at: string | null
  read: boolean
}

export interface NotificationFeed {
  items: AppNotification[]
  unread_count: number
}

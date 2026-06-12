export type NoticeCategory = 'general' | 'circular' | 'urgent_alert' | 'event' | 'holiday' | 'exam'
export type NoticePriority = 'normal' | 'important' | 'urgent'
export type NoticeStatus = 'draft' | 'scheduled' | 'published' | 'archived'
export type NoticeDeliveryStatus = NoticeStatus | 'expired'
export type NoticeTargetType = 'school' | 'role' | 'class' | 'section' | 'student' | 'guardian' | 'employee'

export interface NoticeTarget {
  id: number
  type: NoticeTargetType
  target_id: number | null
  value: string | null
  label: string
}

export interface Notice {
  id: number
  created_by: number | null
  published_by: number | null
  title: string
  body: string
  category: NoticeCategory
  priority: NoticePriority
  status: NoticeStatus
  delivery_status: NoticeDeliveryStatus
  publish_at: string | null
  published_at: string | null
  expires_at: string | null
  attachment_path: string | null
  attachment_url: string | null
  read_count: number
  recipient_count: number
  read_percentage: number
  is_read: boolean
  targets: NoticeTarget[]
  creator: { id: number; name: string; email: string } | null
  publisher: { id: number; name: string; email: string } | null
  created_at: string | null
  updated_at: string | null
}

export interface NoticeTargetPayload {
  type: NoticeTargetType
  id?: number | null
  value?: string | null
}

export interface NoticePayload {
  title: string
  body: string
  category: NoticeCategory
  priority: NoticePriority
  status: NoticeStatus
  publish_at?: string | null
  expires_at?: string | null
  targets: NoticeTargetPayload[]
}

export interface NoticeListParams {
  page: number
  per_page: number
  search?: string
  category?: string
  priority?: string
  status?: string
}

export interface NoticeListResponse {
  items: Notice[]
  meta: {
    current_page: number
    from: number | null
    last_page: number
    per_page: number
    to: number | null
    total: number
  }
}

export interface NoticeDeliveryRecipient {
  id: number
  name: string
  email: string
  role: string
  read_at: string | null
}

export interface NoticeDelivery {
  notice_id: number
  recipient_count: number
  read_count: number
  unread_count: number
  recipients: NoticeDeliveryRecipient[]
}

export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  general: 'General',
  circular: 'Circular',
  urgent_alert: 'Urgent Alert',
  event: 'Event',
  holiday: 'Holiday',
  exam: 'Exam',
}

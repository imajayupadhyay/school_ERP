import { api } from '@/lib/api'
import type {
  Notice,
  NoticeDelivery,
  NoticeListParams,
  NoticeListResponse,
  NoticePayload,
} from './types'

export async function fetchNotices(params: NoticeListParams): Promise<NoticeListResponse> {
  const { data } = await api.get<{ data: NoticeListResponse }>('/notices', { params })
  return data.data
}

export async function createNotice(payload: NoticePayload): Promise<Notice> {
  const { data } = await api.post<{ data: Notice }>('/notices', payload)
  return data.data
}

export async function updateNotice(id: number, payload: NoticePayload): Promise<Notice> {
  const { data } = await api.put<{ data: Notice }>(`/notices/${id}`, payload)
  return data.data
}

export async function archiveNotice(id: number): Promise<Notice> {
  const { data } = await api.delete<{ data: Notice }>(`/notices/${id}`)
  return data.data
}

export async function uploadNoticeAttachment(id: number, attachment: File): Promise<Notice> {
  const formData = new FormData()
  formData.append('attachment', attachment)
  const { data } = await api.post<{ data: Notice }>(`/notices/${id}/attachment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export async function markNoticeRead(id: number): Promise<{ notice_id: number; read_at: string }> {
  const { data } = await api.post<{ data: { notice_id: number; read_at: string } }>(`/notices/${id}/read`)
  return data.data
}

export async function fetchNoticeDelivery(id: number): Promise<NoticeDelivery> {
  const { data } = await api.get<{ data: NoticeDelivery }>(`/notices/${id}/delivery`)
  return data.data
}

import { api } from '@/lib/api'
import type {
  AttendanceListParams,
  AttendanceListResponse,
  AttendanceRosterParams,
  AttendanceRosterResponse,
  AttendanceSession,
  AttendanceSummaryParams,
  AttendanceSummaryResponse,
  MarkAttendancePayload,
} from './types'

export async function fetchAttendanceSessions(params: AttendanceListParams): Promise<AttendanceListResponse> {
  const { data } = await api.get<{ data: AttendanceListResponse }>('/attendance/sessions', { params })
  return data.data
}

export async function fetchAttendanceSession(id: number): Promise<AttendanceSession> {
  const { data } = await api.get<{ data: AttendanceSession }>(`/attendance/sessions/${id}`)
  return data.data
}

export async function fetchAttendanceRoster(params: AttendanceRosterParams): Promise<AttendanceRosterResponse> {
  const { data } = await api.get<{ data: AttendanceRosterResponse }>('/attendance/roster', { params })
  return data.data
}

export async function markAttendance(payload: MarkAttendancePayload): Promise<AttendanceSession> {
  const { data } = await api.post<{ data: AttendanceSession }>('/attendance/sessions', payload)
  return data.data
}

export async function fetchAttendanceSummary(params: AttendanceSummaryParams): Promise<AttendanceSummaryResponse> {
  const { data } = await api.get<{ data: AttendanceSummaryResponse }>('/attendance/reports/summary', { params })
  return data.data
}

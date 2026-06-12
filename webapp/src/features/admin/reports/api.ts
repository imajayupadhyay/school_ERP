import { api } from '@/lib/api'
import type {
  AuditLogListParams,
  AuditLogListResponse,
  AuditLogSummary,
  ReportFilters,
  ReportOverview,
} from './types'

export async function fetchReportOverview(params: ReportFilters): Promise<ReportOverview> {
  const { data } = await api.get<{ data: ReportOverview }>('/reports/overview', { params })
  return data.data
}

export async function fetchAuditLogs(params: AuditLogListParams): Promise<AuditLogListResponse> {
  const { data } = await api.get<{ data: AuditLogListResponse }>('/reports/audit-logs', { params })
  return data.data
}

export async function fetchAuditLogSummary(params: AuditLogListParams): Promise<AuditLogSummary> {
  const { data } = await api.get<{ data: AuditLogSummary }>('/reports/audit-logs/summary', { params })
  return data.data
}

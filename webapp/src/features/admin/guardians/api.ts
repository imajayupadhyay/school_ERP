import { api } from '@/lib/api'
import type {
  Guardian,
  GuardianListParams,
  GuardianListResponse,
  GuardianPayload,
  GuardianStudentPayload,
} from './types'

export async function fetchGuardians(params: GuardianListParams): Promise<GuardianListResponse> {
  const { data } = await api.get<{ data: GuardianListResponse }>('/guardians', { params })
  return data.data
}

export async function createGuardian(payload: GuardianPayload): Promise<Guardian> {
  const { data } = await api.post<{ data: Guardian }>('/guardians', payload)
  return data.data
}

export async function updateGuardian(id: number, payload: GuardianPayload): Promise<Guardian> {
  const { data } = await api.put<{ data: Guardian }>(`/guardians/${id}`, payload)
  return data.data
}

export async function archiveGuardian(id: number): Promise<Guardian> {
  const { data } = await api.delete<{ data: Guardian }>(`/guardians/${id}`)
  return data.data
}

export async function syncGuardianStudents(id: number, students: GuardianStudentPayload[]): Promise<Guardian> {
  const { data } = await api.put<{ data: Guardian }>(`/guardians/${id}/students`, { students })
  return data.data
}

export async function resetGuardianPassword(id: number, password: string): Promise<Guardian> {
  const { data } = await api.post<{ data: Guardian }>(`/guardians/${id}/reset-password`, { password })
  return data.data
}

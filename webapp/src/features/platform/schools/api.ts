import { platformApi } from '@/lib/platformApi'
import type {
  CreateSchoolPayload,
  CreateSchoolResult,
  PlatformSchool,
  SchoolListParams,
  SchoolListResult,
  UpdateSchoolPayload,
} from './types'

/** GET /platform/schools — paginated, searchable, status-filterable. */
export async function fetchSchools(params: SchoolListParams): Promise<SchoolListResult> {
  const { data } = await platformApi.get<{ data: SchoolListResult }>('/platform/schools', { params })
  return data.data
}

/** GET /platform/schools/{id} — full detail incl. owner admins. */
export async function fetchSchool(id: number): Promise<PlatformSchool> {
  const { data } = await platformApi.get<{ data: PlatformSchool }>(`/platform/schools/${id}`)
  return data.data
}

/** POST /platform/schools — create a tenant + first owner admin. */
export async function createSchool(payload: CreateSchoolPayload): Promise<CreateSchoolResult> {
  const { data } = await platformApi.post<{ data: CreateSchoolResult }>('/platform/schools', payload)
  return data.data
}

/** PUT /platform/schools/{id} — update a tenant's profile + status. */
export async function updateSchool(id: number, payload: UpdateSchoolPayload): Promise<PlatformSchool> {
  const { data } = await platformApi.put<{ data: PlatformSchool }>(`/platform/schools/${id}`, payload)
  return data.data
}

/** POST /platform/schools/{id}/status — change lifecycle status. */
export async function setSchoolStatus(id: number, status: string): Promise<PlatformSchool> {
  const { data } = await platformApi.post<{ data: PlatformSchool }>(`/platform/schools/${id}/status`, { status })
  return data.data
}

/**
 * DELETE /platform/schools/{id} — permanently delete the school and ALL of its
 * data. `confirmCode` must equal the school's code (server-enforced safeguard).
 */
export async function deleteSchool(id: number, confirmCode: string): Promise<void> {
  await platformApi.delete(`/platform/schools/${id}`, { data: { confirm_code: confirmCode } })
}

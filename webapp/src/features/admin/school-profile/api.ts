import { api } from '@/lib/api'
import type { SchoolProfile, UpdateSchoolProfilePayload } from './types'

/** GET /school-profile — the authenticated user's school profile. */
export async function fetchSchoolProfile(): Promise<SchoolProfile> {
  const { data } = await api.get<{ data: SchoolProfile }>('/school-profile')
  return data.data
}

/** PUT /school-profile — update editable profile fields. */
export async function updateSchoolProfile(
  payload: UpdateSchoolProfilePayload,
): Promise<SchoolProfile> {
  const { data } = await api.put<{ data: SchoolProfile }>('/school-profile', payload)
  return data.data
}

/** POST /school-profile/logo — upload/replace the school logo (multipart). */
export async function uploadSchoolLogo(file: File): Promise<SchoolProfile> {
  const form = new FormData()
  form.append('logo', file)

  const { data } = await api.post<{ data: SchoolProfile }>('/school-profile/logo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

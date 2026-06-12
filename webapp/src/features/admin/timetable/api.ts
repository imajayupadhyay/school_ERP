import { api } from '@/lib/api'
import type {
  PeriodSlot,
  PeriodSlotPayload,
  TeacherTimetableResponse,
  Timetable,
  TimetableEntryPayload,
  TimetablePayload,
} from './types'

// --- Period slots (school-wide bell schedule) ---

export async function fetchPeriodSlots(): Promise<PeriodSlot[]> {
  const { data } = await api.get<{ data: PeriodSlot[] }>('/period-slots')
  return data.data
}

export async function createPeriodSlot(payload: PeriodSlotPayload): Promise<PeriodSlot> {
  const { data } = await api.post<{ data: PeriodSlot }>('/period-slots', payload)
  return data.data
}

export async function updatePeriodSlot(id: number, payload: PeriodSlotPayload): Promise<PeriodSlot> {
  const { data } = await api.put<{ data: PeriodSlot }>(`/period-slots/${id}`, payload)
  return data.data
}

export async function deletePeriodSlot(id: number): Promise<void> {
  await api.delete(`/period-slots/${id}`)
}

// --- Timetables ---

export async function fetchTimetables(params?: {
  academic_session_id?: number
  class_id?: number
  section_id?: number
}): Promise<Timetable[]> {
  const { data } = await api.get<{ data: Timetable[] }>('/timetables', { params })
  return data.data
}

export async function fetchTimetable(id: number): Promise<Timetable> {
  const { data } = await api.get<{ data: Timetable }>(`/timetables/${id}`)
  return data.data
}

export async function createTimetable(payload: TimetablePayload): Promise<Timetable> {
  const { data } = await api.post<{ data: Timetable }>('/timetables', payload)
  return data.data
}

export async function saveTimetableEntries(
  id: number,
  entries: TimetableEntryPayload[],
): Promise<Timetable> {
  const { data } = await api.put<{ data: Timetable }>(`/timetables/${id}/entries`, { entries })
  return data.data
}

export async function publishTimetable(id: number): Promise<Timetable> {
  const { data } = await api.post<{ data: Timetable }>(`/timetables/${id}/publish`)
  return data.data
}

export async function unpublishTimetable(id: number): Promise<Timetable> {
  const { data } = await api.post<{ data: Timetable }>(`/timetables/${id}/unpublish`)
  return data.data
}

export async function deleteTimetable(id: number): Promise<void> {
  await api.delete(`/timetables/${id}`)
}

export async function fetchTeacherTimetable(
  employeeId: number,
  params?: { academic_session_id?: number },
): Promise<TeacherTimetableResponse> {
  const { data } = await api.get<{ data: TeacherTimetableResponse }>(
    `/timetables/teacher/${employeeId}`,
    { params },
  )
  return data.data
}

import { api } from '@/lib/api'
import type {
  PeriodSlot,
  PeriodSlotPayload,
  PeriodSlotsResult,
  TeacherTimetableResponse,
  Timetable,
  TimetableEntryPayload,
  TimetablePayload,
} from './types'

// --- Period slots (per-class schedule, falling back to the school default) ---

/**
 * Fetch a schedule. With `class_id` it returns that class's effective slots
 * (its own override, or the inherited default); without it, the school default.
 */
export async function fetchPeriodSlots(params?: { class_id?: number }): Promise<PeriodSlotsResult> {
  const { data } = await api.get<{ data: PeriodSlot[]; meta?: { inherited?: boolean; class_id?: number | null } }>(
    '/period-slots',
    { params },
  )
  return {
    slots: data.data,
    inherited: data.meta?.inherited ?? false,
    class_id: data.meta?.class_id ?? null,
  }
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

/** Clone the school default schedule into a class so it can be customised. */
export async function copyDefaultToClass(classId: number): Promise<PeriodSlot[]> {
  const { data } = await api.post<{ data: PeriodSlot[] }>(`/classes/${classId}/period-slots/copy-default`)
  return data.data
}

/** Remove a class's custom schedule, reverting it to the school default. */
export async function deleteClassSchedule(classId: number): Promise<void> {
  await api.delete(`/classes/${classId}/period-slots`)
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

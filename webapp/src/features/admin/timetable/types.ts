export interface PeriodSlot {
  id: number
  name: string
  sequence: number
  start_time: string | null
  end_time: string | null
  is_break: boolean
  status: string
}

export type PeriodSlotPayload = {
  name: string
  sequence: number
  start_time?: string | null
  end_time?: string | null
  is_break?: boolean
  status?: string
}

export interface TimetableEntry {
  id: number
  timetable_id: number
  day_of_week: number
  period_slot_id: number
  subject_id: number
  employee_id: number
  subject?: { id: number; name: string } | null
  employee?: { id: number; name: string } | null
  period_slot?: PeriodSlot | null
}

export type TimetableEntryPayload = {
  day_of_week: number
  period_slot_id: number
  subject_id: number
  employee_id: number
}

export type TimetableStatus = 'draft' | 'published'

export interface Timetable {
  id: number
  academic_session_id: number
  class_id: number
  section_id: number
  status: TimetableStatus
  published_at: string | null
  academic_session?: { id: number; name: string } | null
  school_class?: { id: number; name: string } | null
  section?: { id: number; name: string } | null
  entries?: TimetableEntry[]
  entries_count: number
}

export type TimetablePayload = {
  academic_session_id: number
  class_id: number
  section_id: number
}

export interface TeacherTimetableEntry {
  id: number
  day_of_week: number
  period_slot_id: number
  period_slot: {
    id: number
    name: string
    sequence: number
    start_time: string | null
    end_time: string | null
  } | null
  subject: { id: number; name: string } | null
  class_name: string | null
  section_name: string | null
  status: TimetableStatus
}

export interface TeacherTimetableResponse {
  employee: { id: number; name: string }
  entries: TeacherTimetableEntry[]
}

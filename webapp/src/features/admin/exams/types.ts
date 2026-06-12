export type ExamType = 'unit_test' | 'term' | 'midterm' | 'final' | 'practical' | 'other'
export type ExamStatus = 'draft' | 'scheduled' | 'completed' | 'archived'
export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled'
export type MarkAttendanceStatus = 'present' | 'absent' | 'exempt'

export interface Exam {
  id: number
  academic_session_id: number
  name: string
  exam_type: ExamType
  start_date: string
  end_date: string
  description: string | null
  status: ExamStatus
  academic_session?: { id: number; name: string } | null
  schedules_count: number
  published_results_count: number
}

export interface ExamPayload {
  academic_session_id: number
  name: string
  exam_type: ExamType
  start_date: string
  end_date: string
  description?: string | null
  status?: ExamStatus
}

export interface ExamSchedule {
  id: number
  exam_id: number
  class_id: number
  section_id: number | null
  subject_id: number
  exam_date: string
  start_time: string | null
  end_time: string | null
  max_marks: number
  passing_marks: number
  room: string | null
  status: ScheduleStatus
  exam?: { id: number; name: string; exam_type: ExamType; academic_session_id: number } | null
  class?: { id: number; name: string } | null
  section?: { id: number; name: string } | null
  subject?: { id: number; name: string; code: string | null } | null
  marks_count: number
  submitted_marks_count: number
}

export interface ExamSchedulePayload {
  exam_id: number
  class_id: number
  section_id?: number | null
  subject_id: number
  exam_date: string
  start_time?: string | null
  end_time?: string | null
  max_marks: number
  passing_marks: number
  room?: string | null
  status?: ScheduleStatus
}

export interface MarkRosterStudent {
  student_id: number
  admission_no: string | null
  full_name: string
  roll_no: string | null
  marks_obtained: number | null
  attendance_status: MarkAttendanceStatus
  remarks: string | null
  status: 'draft' | 'submitted'
}

export interface MarkRosterResponse {
  schedule: ExamSchedule
  is_locked: boolean
  students: MarkRosterStudent[]
}

export interface SaveMarksPayload {
  status: 'draft' | 'submitted'
  records: Array<{
    student_id: number
    marks_obtained?: number | null
    attendance_status: MarkAttendanceStatus
    remarks?: string | null
  }>
}

export interface ExamResultItem {
  id: number
  exam_schedule_id: number | null
  subject_id: number | null
  subject_name: string
  max_marks: number
  passing_marks: number
  marks_obtained: number | null
  attendance_status: MarkAttendanceStatus
  grade: string | null
  result_status: 'pass' | 'fail' | 'exempt' | 'incomplete'
}

export interface ExamResult {
  id: number
  exam_id: number
  student_id: number
  class_id: number
  section_id: number | null
  total_marks: number
  obtained_marks: number
  percentage: number
  grade: string | null
  result_status: 'pass' | 'fail' | 'incomplete'
  status: 'draft' | 'published'
  published_at: string | null
  exam?: {
    id: number
    name: string
    exam_type: ExamType
    start_date: string
    end_date: string
  } | null
  student?: {
    id: number
    admission_no: string | null
    full_name: string
    roll_no: string | null
    class_name: string | null
    section: string | null
  } | null
  class?: { id: number; name: string } | null
  section?: { id: number; name: string } | null
  publisher?: { id: number; name: string } | null
  items?: ExamResultItem[]
}

export interface ResultScopePayload {
  class_id: number
  section_id?: number | null
}

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  unit_test: 'Unit Test',
  term: 'Term Exam',
  midterm: 'Midterm',
  final: 'Final Exam',
  practical: 'Practical',
  other: 'Other',
}

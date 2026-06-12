export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'excused'

export interface AttendanceSummary {
  total: number
  present: number
  absent: number
  late: number
  half_day: number
  excused: number
}

export interface AttendanceStudentRecord {
  student_id: number
  admission_no: string | null
  full_name: string
  roll_no: string | null
  class_name: string | null
  section: string | null
  status: AttendanceStatus
  remarks: string | null
}

export interface AttendanceRecord {
  id: number
  attendance_session_id: number
  student_id: number
  status: AttendanceStatus
  remarks: string | null
  student: {
    id: number
    admission_no: string | null
    full_name: string
    roll_no: string | null
    class_name: string | null
    section: string | null
    status: string
  } | null
}

export interface AttendanceSession {
  id: number
  academic_session_id: number
  class_id: number
  section_id: number | null
  attendance_date: string
  marked_by: number | null
  status: 'draft' | 'submitted'
  remarks: string | null
  academic_session?: { id: number; name: string } | null
  class?: { id: number; name: string } | null
  section?: { id: number; name: string } | null
  marker?: { id: number; name: string; email: string } | null
  summary: AttendanceSummary
  records?: AttendanceRecord[]
}

export interface AttendanceListParams {
  page: number
  per_page: number
  academic_session_id?: number
  class_id?: number
  section_id?: number
  date?: string
  from?: string
  to?: string
  status?: string
}

export interface AttendanceListMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface AttendanceListResponse {
  items: AttendanceSession[]
  meta: AttendanceListMeta
}

export interface AttendanceRosterParams {
  academic_session_id: number
  class_id: number
  section_id?: number
  attendance_date: string
}

export interface AttendanceRosterResponse {
  session: AttendanceSession | null
  is_marked: boolean
  students: AttendanceStudentRecord[]
  summary: AttendanceSummary
}

export interface MarkAttendancePayload extends AttendanceRosterParams {
  status?: 'draft' | 'submitted'
  remarks?: string | null
  records: Array<{
    student_id: number
    status: AttendanceStatus
    remarks?: string | null
  }>
}

export interface AttendanceSummaryParams {
  from: string
  to: string
  academic_session_id?: number
  class_id?: number
  section_id?: number
  student_id?: number
}

export interface AttendanceReportItem extends AttendanceSummary {
  student_id: number | null
  admission_no: string | null
  full_name: string | null
  roll_no: string | null
  class_name: string | null
  section: string | null
  attendance_percentage: number
}

export interface AttendanceSummaryResponse {
  range: {
    from: string
    to: string
  }
  sessions_count: number
  summary: AttendanceSummary
  items: AttendanceReportItem[]
}

export interface ReportFilters {
  from?: string
  to?: string
  academic_session_id?: number
  class_id?: number
  section_id?: number
}

export interface StudentReportSummary {
  total: number
  active: number
  new_admissions: number
  archived: number
}

export interface EmployeeReportSummary {
  total: number
  active: number
  teaching: number
  new_joiners: number
}

export interface FeeReportSummary {
  billed: number
  collected: number
  paid_on_invoices: number
  outstanding: number
  overdue: number
  collection_rate: number
  invoices: number
  payments: number
}

export interface AttendanceReportSummary {
  sessions: number
  records: number
  present: number
  absent: number
  late: number
  half_day: number
  excused: number
  attendance_rate: number
}

export interface ExamReportSummary {
  published_results: number
  passed: number
  failed: number
  average_percentage: number
  pass_rate: number
}

export interface LearningReportSummary {
  homework: number
  homework_published: number
  study_materials: number
  materials_published: number
  notices: number
  notices_published: number
}

export interface AuditReportSummary {
  events: number
  actors: number
  modules: Array<{ module: string; count: number }>
}

export interface FeeByClass {
  class_id: number | null
  class_name: string
  students: number
  billed: number
  collected: number
  outstanding: number
  collection_rate: number
}

export interface AttendanceByClass {
  class_id: number | null
  class_name: string
  sessions: number
  records: number
  present: number
  absent: number
  late: number
  half_day: number
  excused: number
  attendance_rate: number
}

export interface ExamByClass {
  class_id: number | null
  class_name: string
  results: number
  passed: number
  failed: number
  average_percentage: number
  pass_rate: number
}

export interface ActivityPoint {
  date: string
  label: string
  events: number
}

export interface ReportOverview {
  range: { from: string; to: string }
  filters: {
    academic_session_id: number | null
    class_id: number | null
    section_id: number | null
  }
  students: StudentReportSummary
  employees: EmployeeReportSummary
  fees: FeeReportSummary
  attendance: AttendanceReportSummary
  exams: ExamReportSummary
  learning: LearningReportSummary
  audit: AuditReportSummary
  fee_by_class: FeeByClass[]
  attendance_by_class: AttendanceByClass[]
  exam_by_class: ExamByClass[]
  activity_trend: ActivityPoint[]
}

export interface AuditLogActor {
  id: number
  name: string
  email: string
  role: string
}

export interface AuditLog {
  id: number
  action: string
  module: string
  action_label: string
  actor: AuditLogActor | null
  auditable: {
    type: string | null
    id: number | null
  }
  changed_fields: string[]
  changes_count: number
  changes: Record<string, unknown>
  ip_address: string | null
  created_at: string | null
}

export interface PaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface AuditLogListParams {
  page?: number
  per_page?: number
  search?: string
  module?: string
  action?: string
  user_id?: number
  from?: string
  to?: string
}

export interface AuditLogListResponse {
  items: AuditLog[]
  meta: PaginationMeta
}

export interface AuditLogSummary {
  total: number
  actors: number
  modules: Array<{ module: string; count: number }>
  top_actors: Array<{ user_id: number; name: string | null; role: string | null; count: number }>
  recent: AuditLog[]
}

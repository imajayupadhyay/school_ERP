export interface PlatformSchoolSummary {
  id: number
  name: string
  code: string
  city: string | null
  status: string
  students_count: number
  created_at: string | null
}

export interface PlatformTrendPoint {
  label: string
  value: number
}

export interface PlatformDashboard {
  totals: {
    schools: number
    active_schools: number
    inactive_schools: number
    new_schools_this_month: number
    users: number
    students: number
    employees: number
    guardians: number
  }
  schools_by_status: Record<string, number>
  growth_trend: PlatformTrendPoint[]
  recent_schools: PlatformSchoolSummary[]
  top_schools: PlatformSchoolSummary[]
}

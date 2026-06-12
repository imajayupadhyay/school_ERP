import type { School } from '@/features/auth/types'

export interface DashboardStats {
  students_total: number
  students_active: number
  staff_total: number
  teachers_total: number
  classes_total: number
  sections_total: number
}

export interface GenderSplit {
  male: number
  female: number
  other: number
}

export interface ClassCount {
  class_name: string
  count: number
}

export interface RecentStudent {
  id: number
  name: string
  admission_no: string | null
  class_name: string | null
  section: string | null
  gender: string | null
  status: string
  admission_date: string | null
}

export interface FeeSummary {
  billed: number
  collected: number
  outstanding: number
  overdue: number
  collection_rate: number
}

export interface FeeStatusBreakdown {
  paid: number
  partial: number
  pending: number
  overdue: number
}

export interface AttendanceToday {
  date: string | null
  present: number
  absent: number
  late: number
  excused: number
  total: number
  rate: number
}

export interface TrendPoint {
  label: string
  month?: string
  date?: string
  amount?: number
  count?: number
  rate?: number
}

export interface DashboardData {
  school: School
  stats: DashboardStats
  fees: FeeSummary
  fee_status: FeeStatusBreakdown
  collection_trend: TrendPoint[]
  attendance_today: AttendanceToday
  attendance_trend: TrendPoint[]
  admissions_trend: TrendPoint[]
  students_by_gender: GenderSplit
  students_by_class: ClassCount[]
  recent_students: RecentStudent[]
}

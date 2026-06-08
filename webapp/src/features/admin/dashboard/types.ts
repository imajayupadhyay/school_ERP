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

export interface DashboardData {
  school: School
  stats: DashboardStats
  students_by_gender: GenderSplit
  students_by_class: ClassCount[]
  recent_students: RecentStudent[]
}

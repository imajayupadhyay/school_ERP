export interface EmployeeLogin {
  has_login: boolean
  enabled: boolean
  user_id: number | null
  email: string | null
  role: string | null
  status: string | null
}

export interface EmployeeAssignment {
  id: number
  class_id: number
  section_id: number | null
  subject_id: number | null
  assignment_type: 'class_teacher' | 'subject_teacher'
  status: string
  class?: { id: number; name: string }
  section?: { id: number; name: string } | null
  subject?: { id: number; name: string; code: string | null } | null
}

export interface Employee {
  id: number
  employee_code: string
  first_name: string
  last_name: string | null
  full_name: string
  gender: string | null
  date_of_birth: string | null
  employee_type: 'teaching' | 'non_teaching'
  designation: string | null
  department: string | null
  employment_type: 'full_time' | 'part_time' | 'contract' | 'temporary'
  joining_date: string | null
  qualification: string | null
  experience_years: string | null
  email: string | null
  phone: string | null
  alternate_phone: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  status: 'active' | 'inactive' | 'on_leave' | 'terminated'
  login: EmployeeLogin
  assignments: EmployeeAssignment[]
}

export interface EmployeePayload {
  employee_code: string
  first_name: string
  last_name?: string | null
  gender?: string | null
  date_of_birth?: string | null
  employee_type: 'teaching' | 'non_teaching'
  designation?: string | null
  department?: string | null
  employment_type: 'full_time' | 'part_time' | 'contract' | 'temporary'
  joining_date?: string | null
  qualification?: string | null
  experience_years?: number | null
  email?: string | null
  phone?: string | null
  alternate_phone?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  status?: string
  login_enabled?: boolean
  login_email?: string | null
  login_password?: string | null
  login_role?: string | null
  login_status?: string | null
}

export interface EmployeeAssignmentPayload {
  assignment_type: 'class_teacher' | 'subject_teacher'
  class_id: number
  section_id?: number | null
  subject_id?: number | null
  status?: string
}

export interface EmployeeListParams {
  page: number
  per_page: number
  search?: string
  status?: string
  employee_type?: string
}

export interface EmployeeListMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface EmployeeListResponse {
  items: Employee[]
  meta: EmployeeListMeta
}

export interface GuardianPortal {
  has_login: boolean
  enabled: boolean
  user_id: number | null
  email: string | null
  role: string | null
  status: string | null
}

export interface GuardianStudentRef {
  id: number
  admission_no: string | null
  full_name: string
  class_name: string | null
  section: string | null
  roll_no: string | null
  status: string
  relationship: string | null
  is_primary: boolean
  is_emergency_contact: boolean
  pickup_allowed: boolean
}

export interface Guardian {
  id: number
  name: string
  relation: string | null
  phone: string | null
  alternate_phone: string | null
  email: string | null
  occupation: string | null
  address: string | null
  status: 'active' | 'inactive'
  portal: GuardianPortal
  students: GuardianStudentRef[]
}

export interface GuardianPayload {
  name: string
  relation?: string | null
  phone?: string | null
  alternate_phone?: string | null
  email?: string | null
  occupation?: string | null
  address?: string | null
  status?: string
  portal_enabled?: boolean
  portal_email?: string | null
  portal_password?: string | null
  portal_status?: string | null
}

export interface GuardianStudentPayload {
  student_id: number
  relationship?: string | null
  is_primary?: boolean
  is_emergency_contact?: boolean
  pickup_allowed?: boolean
}

export interface GuardianListParams {
  page: number
  per_page: number
  search?: string
  status?: string
  portal_status?: string
}

export interface GuardianListMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface GuardianListResponse {
  items: Guardian[]
  meta: GuardianListMeta
}

export interface StudentGuardian {
  id: number
  name: string
  relation: string | null
  phone: string | null
  alternate_phone: string | null
  email: string | null
  occupation: string | null
  address: string | null
  status: string
  relationship?: string | null
  is_primary?: boolean
  is_emergency_contact?: boolean
  pickup_allowed?: boolean
}

export interface Student {
  id: number
  academic_session_id: number | null
  admission_no: string | null
  admission_type: string
  first_name: string
  middle_name: string | null
  last_name: string | null
  full_name: string
  gender: string | null
  date_of_birth: string | null
  class_id: number | null
  section_id: number | null
  class_name: string | null
  section: string | null
  roll_no: string | null
  house: string | null
  category: string | null
  religion: string | null
  blood_group: string | null
  nationality: string | null
  mother_tongue: string | null
  photo_path: string | null
  photo_url: string | null
  primary_phone: string | null
  primary_email: string | null
  current_address: string | null
  permanent_address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  guardian_name: string | null
  guardian_phone: string | null
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_phone: string | null
  medical_conditions: string | null
  allergies: string | null
  medications: string | null
  doctor_name: string | null
  doctor_phone: string | null
  previous_school_name: string | null
  previous_school_board: string | null
  previous_school_class: string | null
  previous_school_transfer_certificate_no: string | null
  status: 'active' | 'inactive' | 'archived' | 'transferred' | 'alumni'
  admission_date: string | null
  transfer_date: string | null
  transfer_reason: string | null
  guardians: StudentGuardian[]
}

export interface StudentPayload {
  academic_session_id?: number | null
  admission_no?: string | null
  admission_type?: string | null
  first_name: string
  middle_name?: string | null
  last_name?: string | null
  gender?: string | null
  date_of_birth?: string | null
  class_id?: number | null
  section_id?: number | null
  roll_no?: string | null
  house?: string | null
  category?: string | null
  religion?: string | null
  blood_group?: string | null
  nationality?: string | null
  mother_tongue?: string | null
  primary_phone?: string | null
  primary_email?: string | null
  current_address?: string | null
  permanent_address?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  guardian_name?: string | null
  guardian_phone?: string | null
  emergency_contact_name?: string | null
  emergency_contact_relation?: string | null
  emergency_contact_phone?: string | null
  medical_conditions?: string | null
  allergies?: string | null
  medications?: string | null
  doctor_name?: string | null
  doctor_phone?: string | null
  previous_school_name?: string | null
  previous_school_board?: string | null
  previous_school_class?: string | null
  previous_school_transfer_certificate_no?: string | null
  status?: string | null
  admission_date?: string | null
  guardians?: StudentGuardianPayload[]
}

export interface StudentGuardianPayload {
  id?: number
  name: string
  relation?: string | null
  phone?: string | null
  alternate_phone?: string | null
  email?: string | null
  occupation?: string | null
  address?: string | null
  is_primary?: boolean
  is_emergency_contact?: boolean
  pickup_allowed?: boolean
}

export interface StudentListParams {
  page: number
  per_page: number
  search?: string
  academic_session_id?: string
  class_id?: string
  section_id?: string
  status?: string
  gender?: string
}

export interface StudentListMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface StudentListResponse {
  items: Student[]
  meta: StudentListMeta
}

export interface TransferStudentPayload {
  transfer_type: 'internal' | 'outgoing'
  academic_session_id?: number | null
  class_id?: number | null
  section_id?: number | null
  roll_no?: string | null
  transfer_date?: string | null
  transfer_reason?: string | null
}

export interface PromoteStudentsPayload {
  from_academic_session_id?: number | null
  to_academic_session_id?: number | null
  from_class_id: number
  from_section_id?: number | null
  to_class_id: number
  to_section_id?: number | null
}

export interface StudentHistoryItem {
  id: number
  action: string
  changes: Record<string, unknown>
  user: { id: number; name: string; email: string } | null
  created_at: string | null
}

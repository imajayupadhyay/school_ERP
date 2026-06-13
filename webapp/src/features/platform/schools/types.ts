export interface SchoolAdmin {
  id: number
  name: string
  email: string
  phone: string | null
  role: string
  role_label: string
  status: string
}

export interface PlatformSchool {
  id: number
  name: string
  code: string
  status: string

  email: string | null
  phone: string | null
  alternate_phone: string | null
  website: string | null

  address: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null

  timezone: string | null
  date_format: string | null
  currency: string | null
  academic_year_start_month: number | null

  board_affiliation: string | null
  registration_number: string | null
  udise_code: string | null
  principal_name: string | null
  established_year: number | null

  logo_path: string | null
  logo_url: string | null

  students_count?: number
  employees_count?: number
  users_count?: number
  admins?: SchoolAdmin[]

  created_at: string | null
  updated_at: string | null
}

export interface PaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface SchoolListResult {
  items: PlatformSchool[]
  meta: PaginationMeta
}

export interface SchoolListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
}

/** Payload for creating a school + its first owner admin. */
export interface CreateSchoolPayload {
  name: string
  code?: string
  status?: string
  email?: string
  phone?: string
  city?: string
  state?: string
  country?: string
  board_affiliation?: string
  admin_name: string
  admin_email: string
  admin_phone?: string
  admin_password?: string
}

/** Payload for editing an existing school. */
export interface UpdateSchoolPayload {
  name: string
  code: string
  status: string
  email?: string | null
  phone?: string | null
  alternate_phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  board_affiliation?: string | null
  registration_number?: string | null
  udise_code?: string | null
  principal_name?: string | null
  established_year?: number | null
}

export interface CreateSchoolResult {
  school: PlatformSchool
  admin: { id: number; name: string; email: string }
  temporary_password: string | null
}

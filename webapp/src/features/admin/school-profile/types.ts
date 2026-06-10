export interface SchoolProfile {
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
}

/** Editable subset sent to PUT /school-profile. */
export type UpdateSchoolProfilePayload = Omit<
  SchoolProfile,
  'id' | 'code' | 'status' | 'logo_path' | 'logo_url'
>

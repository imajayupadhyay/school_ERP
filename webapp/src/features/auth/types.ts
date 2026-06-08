export interface School {
  id: number
  name: string
  code: string
  email: string | null
  phone: string | null
  city: string | null
  logo_path: string | null
  status: string
}

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  role: string
  status: string
  school_id: number | null
  school: School | null
}

export interface LoginPayload {
  school_code: string
  email: string
  password: string
  remember?: boolean
}

export interface LoginResult {
  token: string
  user: User
}

import type { User } from '@/features/auth/types'

/** The platform owner is a `User` with role `super_admin` and no school. */
export type PlatformUser = User

export interface PlatformLoginPayload {
  email: string
  password: string
  remember?: boolean
}

export interface PlatformLoginResult {
  token: string
  user: PlatformUser
}

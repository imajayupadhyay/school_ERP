import { api } from '@/lib/api'
import type { LoginPayload, LoginResult, User } from './types'

/** POST /auth/login — returns a Sanctum token + the authenticated user. */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  const { data } = await api.post<{ data: LoginResult }>('/auth/login', payload)
  return data.data
}

/** GET /auth/me — current user (used to rehydrate a session on reload). */
export async function fetchMe(): Promise<User> {
  const { data } = await api.get<{ data: User }>('/auth/me')
  return data.data
}

/** POST /auth/logout — revoke the current token. */
export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

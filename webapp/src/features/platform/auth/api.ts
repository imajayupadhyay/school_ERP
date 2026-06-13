import { platformApi } from '@/lib/platformApi'
import type { PlatformLoginPayload, PlatformLoginResult, PlatformUser } from './types'

/** POST /platform/auth/login — returns a Sanctum token + the platform owner. */
export async function platformLogin(payload: PlatformLoginPayload): Promise<PlatformLoginResult> {
  const { data } = await platformApi.post<{ data: PlatformLoginResult }>('/platform/auth/login', payload)
  return data.data
}

/** GET /platform/auth/me — current platform owner (rehydrate a session). */
export async function fetchPlatformMe(): Promise<PlatformUser> {
  const { data } = await platformApi.get<{ data: PlatformUser }>('/platform/auth/me')
  return data.data
}

/** POST /platform/auth/logout — revoke the current token. */
export async function platformLogout(): Promise<void> {
  await platformApi.post('/platform/auth/logout')
}

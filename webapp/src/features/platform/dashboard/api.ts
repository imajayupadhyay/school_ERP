import { platformApi } from '@/lib/platformApi'
import type { PlatformDashboard } from './types'

/** GET /platform/dashboard — platform-wide aggregates for the super admin. */
export async function fetchPlatformDashboard(): Promise<PlatformDashboard> {
  const { data } = await platformApi.get<{ data: PlatformDashboard }>('/platform/dashboard')
  return data.data
}

import { api } from '@/lib/api'
import type { DashboardData } from './types'

/** GET /dashboard — School Admin summary, scoped server-side to the user's school. */
export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get<{ data: DashboardData }>('/dashboard')
  return data.data
}

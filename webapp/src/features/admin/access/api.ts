import { api } from '@/lib/api'
import type { PermissionCatalog, Role, RolePayload, UserAccess, UserAccessPayload } from './types'

export async function fetchPermissionCatalog(): Promise<PermissionCatalog> {
  const { data } = await api.get<{ data: PermissionCatalog }>('/access/permissions')
  return data.data
}

export async function fetchRoles(): Promise<Role[]> {
  const { data } = await api.get<{ data: Role[] }>('/access/roles')
  return data.data
}

export async function createRole(payload: RolePayload): Promise<Role> {
  const { data } = await api.post<{ data: Role }>('/access/roles', payload)
  return data.data
}

export async function updateRole(id: number, payload: RolePayload): Promise<Role> {
  const { data } = await api.put<{ data: Role }>(`/access/roles/${id}`, payload)
  return data.data
}

export async function deleteRole(id: number): Promise<void> {
  await api.delete(`/access/roles/${id}`)
}

export async function fetchUserAccess(userId: number): Promise<UserAccess> {
  const { data } = await api.get<{ data: UserAccess }>(`/access/users/${userId}`)
  return data.data
}

export async function updateUserAccess(
  userId: number,
  payload: UserAccessPayload,
): Promise<UserAccess> {
  const { data } = await api.put<{ data: UserAccess }>(`/access/users/${userId}`, payload)
  return data.data
}

export async function resetUserPassword(userId: number, password: string): Promise<void> {
  await api.post(`/access/users/${userId}/reset-password`, { password })
}

export async function updateUserStatus(userId: number, status: 'active' | 'inactive'): Promise<UserAccess> {
  const { data } = await api.put<{ data: UserAccess }>(`/access/users/${userId}/status`, { status })
  return data.data
}

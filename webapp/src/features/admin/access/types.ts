export interface PermissionAction {
  key: string
  action: string
  label: string
  is_special: boolean
}

export interface PermissionModule {
  module: string
  label: string
  actions: PermissionAction[]
}

export interface PermissionGroup {
  group: string
  modules: PermissionModule[]
}

export interface PermissionCatalog {
  groups: PermissionGroup[]
  keys: string[]
}

export interface Role {
  id: number
  name: string
  slug: string
  description: string | null
  is_system: boolean
  is_owner: boolean
  is_protected: boolean
  permissions: string[]
  permissions_count: number
  users_count?: number
  created_at: string | null
}

export interface RolePayload {
  name: string
  description?: string | null
  permissions: string[]
}

export interface PermissionOverride {
  key: string
  granted: boolean
}

export interface UserAccess {
  user: {
    id: number
    name: string
    email: string
    status: string
    role: string
    role_id: number | null
  }
  role: Role | null
  is_owner: boolean
  role_permissions: string[]
  effective_permissions: string[]
  overrides: PermissionOverride[]
}

export interface UserAccessPayload {
  role_id?: number
  overrides?: PermissionOverride[]
}

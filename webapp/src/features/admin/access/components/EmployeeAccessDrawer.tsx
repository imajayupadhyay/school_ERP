import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import Modal from '../../components/Modal'
import FormField, { inputClass } from '../../components/FormField'
import StatusBadge from '../../components/StatusBadge'
import { KeyIcon } from '../../components/icons'
import PermissionMatrix from './PermissionMatrix'
import {
  fetchPermissionCatalog,
  fetchRoles,
  fetchUserAccess,
  resetUserPassword,
  updateUserAccess,
  updateUserStatus,
} from '../api'
import type { PermissionCatalog, PermissionOverride, Role, UserAccess } from '../types'

type OverrideState = 'inherit' | 'grant' | 'revoke'

interface Props {
  userId: number
  userName: string
  onClose: () => void
}

/**
 * Per-individual access manager: assign a role, override single permissions
 * (inherit / grant / revoke), reset the password, and toggle login status.
 */
export default function EmployeeAccessDrawer({ userId, userName, onClose }: Props) {
  const queryClient = useQueryClient()

  const accessQuery = useQuery({ queryKey: ['access', 'user', userId], queryFn: () => fetchUserAccess(userId) })
  const catalogQuery = useQuery({ queryKey: ['access', 'catalog'], queryFn: fetchPermissionCatalog })
  const rolesQuery = useQuery({ queryKey: ['access', 'roles'], queryFn: fetchRoles })

  if (accessQuery.isLoading || catalogQuery.isLoading || rolesQuery.isLoading) {
    return (
      <Modal title={`Access · ${userName}`} size="lg" onClose={onClose}>
        <div className="grid place-items-center py-16 text-ink/50">
          <span className="h-8 w-8 rounded-full border-2 border-ink/15 border-t-accent animate-spin" />
        </div>
      </Modal>
    )
  }

  if (accessQuery.isError || !accessQuery.data || !catalogQuery.data || !rolesQuery.data) {
    return (
      <Modal title={`Access · ${userName}`} size="lg" onClose={onClose}>
        <p className="py-10 text-center text-[0.88rem] text-[#dc2626]">
          {accessQuery.error ? extractErrorMessage(accessQuery.error) : 'Could not load access.'}
        </p>
      </Modal>
    )
  }

  return (
    <DrawerBody
      userName={userName}
      access={accessQuery.data}
      catalog={catalogQuery.data}
      roles={rolesQuery.data}
      onClose={onClose}
      onSaved={() => {
        queryClient.invalidateQueries({ queryKey: ['access', 'user', userId] })
        queryClient.invalidateQueries({ queryKey: ['access', 'roles'] })
        queryClient.invalidateQueries({ queryKey: ['employees'] })
      }}
    />
  )
}

function DrawerBody({
  userName,
  access,
  catalog,
  roles,
  onClose,
  onSaved,
}: {
  userName: string
  access: UserAccess
  catalog: PermissionCatalog
  roles: Role[]
  onClose: () => void
  onSaved: () => void
}) {
  const [roleId, setRoleId] = useState<number | null>(access.role?.id ?? access.user.role_id)
  const [overrides, setOverrides] = useState<Map<string, OverrideState>>(() => {
    const m = new Map<string, OverrideState>()
    access.overrides.forEach((o) => m.set(o.key, o.granted ? 'grant' : 'revoke'))
    return m
  })
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedRole = roles.find((r) => r.id === roleId) ?? null
  const isOwner = selectedRole?.is_owner ?? access.is_owner
  const roleGrants = useMemo(
    () => new Set(isOwner ? catalog.keys : selectedRole?.permissions ?? []),
    [isOwner, selectedRole, catalog.keys],
  )

  const cycle = (key: string) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      const cur = next.get(key) ?? 'inherit'
      const order: OverrideState[] = ['inherit', 'grant', 'revoke']
      const nextState = order[(order.indexOf(cur) + 1) % order.length]
      if (nextState === 'inherit') next.delete(key)
      else next.set(key, nextState)
      return next
    })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      // A typed password is applied as part of the same Save, so there is no
      // separate "did I click the right button?" trap.
      const pwd = newPassword.trim()
      if (pwd) {
        await resetUserPassword(access.user.id, pwd)
      }

      const payload: { role_id?: number; overrides?: PermissionOverride[] } = {}
      if (roleId) payload.role_id = roleId
      payload.overrides = Array.from(overrides.entries())
        .filter(([, s]) => s !== 'inherit')
        .map(([key, s]) => ({ key, granted: s === 'grant' }))
      return updateUserAccess(access.user.id, payload)
    },
    onSuccess: () => {
      const changedPassword = newPassword.trim().length > 0
      setNewPassword('')
      setNotice(changedPassword ? 'Access and password saved.' : 'Access saved.')
      onSaved()
    },
    onError: (e) => setError(extractErrorMessage(e)),
  })

  const [status, setStatus] = useState(access.user.status)
  const statusMutation = useMutation({
    mutationFn: (next: 'active' | 'inactive') => updateUserStatus(access.user.id, next),
    onSuccess: (data) => {
      setStatus(data.user.status)
      setNotice(`Login ${data.user.status === 'active' ? 'activated' : 'deactivated'}.`)
      onSaved()
    },
    onError: (e) => setError(extractErrorMessage(e)),
  })

  return (
    <Modal
      title={`Access · ${userName}`}
      description="Assign a role, then grant or revoke individual permissions for this person."
      size="lg"
      onClose={onClose}
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-[#dc2626]/25 bg-[#dc2626]/5 px-4 py-3 text-[0.84rem] text-[#dc2626]">
            {error}
          </div>
        )}
        {notice && !error && (
          <div className="rounded-xl border border-[#168a66]/25 bg-[#168a66]/5 px-4 py-3 text-[0.84rem] text-[#168a66]">
            {notice}
          </div>
        )}

        {/* Role + login status */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Role" htmlFor="access-role">
            <select
              id="access-role"
              className={inputClass}
              value={roleId ?? ''}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— No role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.is_owner ? ' (full access)' : ''}
                </option>
              ))}
            </select>
          </FormField>

          <div>
            <span className="mb-1.5 block text-[0.8rem] font-semibold text-ink/55">Login status</span>
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate(status === 'active' ? 'inactive' : 'active')}
                className="rounded-xl border border-line bg-white px-3 py-2 text-[0.82rem] font-semibold text-ink/65 hover:border-accent hover:text-accent disabled:opacity-60"
              >
                {status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>

        {/* Reset password (optional — applied on Save) */}
        <div className="rounded-xl border border-line bg-paper/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-[0.82rem] font-semibold text-ink/65">
            <KeyIcon width={16} height={16} className="text-[#b45309]" />
            Reset password
          </div>
          <label className="block">
            <input
              type="text"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              autoComplete="new-password"
            />
          </label>
          <p className="mt-1.5 text-[0.74rem] text-ink/45">
            Leave blank to keep the current password. A new password is applied when you click{' '}
            <b className="text-ink/60">Save access</b> below.
          </p>
        </div>

        {/* Permission overrides */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[0.8rem] font-semibold text-ink/55">Permissions</span>
            <Legend />
          </div>
          {isOwner ? (
            <div className="rounded-xl border border-[#b45309]/25 bg-[#b45309]/5 px-4 py-3 text-[0.84rem] text-[#b45309]">
              This role has full access. Individual overrides don’t apply to owner roles.
            </div>
          ) : (
            <PermissionMatrix
              catalog={catalog}
              renderAction={(action) => {
                const state = overrides.get(action.key) ?? 'inherit'
                const inheritsGrant = roleGrants.has(action.key)
                const effective = state === 'inherit' ? inheritsGrant : state === 'grant'
                return (
                  <OverrideChip
                    label={action.label}
                    isSpecial={action.is_special}
                    state={state}
                    effective={effective}
                    title={action.key}
                    onClick={() => cycle(action.key)}
                  />
                )
              }}
            />
          )}
        </div>

        <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-2 border-t border-line bg-white/90 px-5 pt-4 backdrop-blur sm:-mx-6 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 hover:border-accent hover:text-accent"
          >
            Close
          </button>
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => {
              setError(null)
              setNotice(null)
              if (newPassword.trim() && newPassword.trim().length < 8) {
                setError('New password must be at least 8 characters.')
                return
              }
              saveMutation.mutate()
            }}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save access'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function OverrideChip({
  label,
  isSpecial,
  state,
  effective,
  title,
  onClick,
}: {
  label: string
  isSpecial: boolean
  state: OverrideState
  effective: boolean
  title: string
  onClick: () => void
}) {
  // Base look reflects the *effective* result; an explicit override adds a ring.
  const base = effective
    ? isSpecial
      ? 'border-[#b45309]/30 bg-[#b45309]/10 text-[#b45309]'
      : 'border-accent/30 bg-accent/10 text-accent'
    : 'border-line bg-white text-ink/45'
  const ring =
    state === 'grant'
      ? 'ring-2 ring-[#168a66]/40'
      : state === 'revoke'
        ? 'ring-2 ring-[#dc2626]/40'
        : ''
  const mark = state === 'grant' ? '＋' : state === 'revoke' ? '－' : effective ? '✓' : '·'

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${title}\n${state === 'inherit' ? 'Inherited from role' : state === 'grant' ? 'Granted for this person' : 'Revoked for this person'}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.78rem] font-medium transition ${base} ${ring}`}
    >
      <span className="grid h-3.5 w-3.5 place-items-center text-[0.7rem] font-bold">{mark}</span>
      {label}
    </button>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[0.7rem] text-ink/45">
      <span className="inline-flex items-center gap-1">
        <span className="grid h-3.5 w-3.5 place-items-center rounded-[4px] ring-2 ring-[#168a66]/40 text-[0.65rem] font-bold text-[#168a66]">＋</span>
        Granted
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="grid h-3.5 w-3.5 place-items-center rounded-[4px] ring-2 ring-[#dc2626]/40 text-[0.65rem] font-bold text-[#dc2626]">－</span>
        Revoked
      </span>
      <span className="text-ink/35">· tap to cycle (inherit → grant → revoke)</span>
    </div>
  )
}

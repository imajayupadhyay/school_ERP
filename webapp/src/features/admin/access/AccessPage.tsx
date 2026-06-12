import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { extractErrorMessage } from '@/lib/errors'
import { PageHeader } from '../components/PageHeader'
import { AddButton, RowAction, TableSkeleton, TableErrorState } from '../components/TableUI'
import Modal from '../components/Modal'
import { ShieldIcon, EditIcon, TrashIcon, UsersGroupIcon } from '../components/icons'
import RoleEditorModal from './components/RoleEditorModal'
import { deleteRole, fetchPermissionCatalog, fetchRoles } from './api'
import type { Role } from './types'

export default function AccessPage() {
  const { can } = useAuth()
  const canManage = can('access.manage')
  const queryClient = useQueryClient()

  const rolesQuery = useQuery({ queryKey: ['access', 'roles'], queryFn: fetchRoles })
  const catalogQuery = useQuery({ queryKey: ['access', 'catalog'], queryFn: fetchPermissionCatalog })

  const [editing, setEditing] = useState<Role | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access', 'roles'] })
      setDeleting(null)
    },
    onError: (e) => setDeleteError(extractErrorMessage(e)),
  })

  const roles = rolesQuery.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldIcon}
        title="Roles & Permissions"
        description="Define what each role can see and do, then fine-tune access per person in Teachers & Staff."
        actions={
          canManage ? <AddButton label="Add Role" onClick={() => setEditing('new')} /> : undefined
        }
        aside={
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1 text-[0.78rem] font-semibold text-paper ring-1 ring-paper/15">
            <span className="text-lime">{roles.length}</span> roles
          </span>
        }
      />

      {!canManage && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          Read-only access — you can review roles but not change them.
        </div>
      )}

      {rolesQuery.isLoading || catalogQuery.isLoading ? (
        <TableSkeleton rows={6} />
      ) : rolesQuery.isError ? (
        <TableErrorState onRetry={() => rolesQuery.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                <th className="px-5 py-3.5 font-bold">Role</th>
                <th className="px-5 py-3.5 font-bold">Type</th>
                <th className="px-5 py-3.5 text-center font-bold">Permissions</th>
                <th className="px-5 py-3.5 text-center font-bold">Members</th>
                <th className="px-5 py-3.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr
                  key={role.id}
                  className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-paper-2 to-paper text-ink/55 ring-1 ring-line transition group-hover:ring-accent/30">
                        <ShieldIcon width={18} height={18} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-ink">{role.name}</div>
                        {role.description && (
                          <div className="mt-0.5 truncate text-[0.76rem] text-ink/45">
                            {role.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <RoleTypeBadge role={role} />
                  </td>
                  <td className="px-5 py-3 text-center tabular-nums text-ink/70">
                    {role.is_owner ? 'All' : role.permissions_count}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1 tabular-nums text-ink/70">
                      <UsersGroupIcon width={15} height={15} className="text-ink/35" />
                      {role.users_count ?? 0}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                      <RowAction
                        label={canManage && !role.is_owner ? 'Edit' : 'View'}
                        onClick={() => setEditing(role)}
                      >
                        <EditIcon width={17} height={17} />
                      </RowAction>
                      <RowAction
                        label="Delete"
                        danger
                        disabled={!canManage || role.is_protected || role.is_system}
                        onClick={() => {
                          setDeleteError(null)
                          setDeleting(role)
                        }}
                      >
                        <TrashIcon width={17} height={17} />
                      </RowAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && catalogQuery.data && (
        <RoleEditorModal
          catalog={catalogQuery.data}
          role={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <Modal
          title={`Delete role · ${deleting.name}`}
          description="This cannot be undone."
          onClose={() => setDeleting(null)}
        >
          {deleteError && (
            <div className="mb-4 rounded-xl border border-[#dc2626]/25 bg-[#dc2626]/5 px-4 py-3 text-[0.84rem] text-[#dc2626]">
              {deleteError}
            </div>
          )}
          <p className="text-[0.88rem] text-ink/65">
            Are you sure you want to delete <b className="text-ink">{deleting.name}</b>? Members must
            be reassigned first.
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 hover:border-accent hover:text-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleting.id)}
              className="rounded-xl bg-[#dc2626] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:opacity-60"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete role'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function RoleTypeBadge({ role }: { role: Role }) {
  if (role.is_owner) {
    return (
      <span className="rounded-full bg-[#b45309]/12 px-2 py-0.5 text-[0.7rem] font-bold text-[#b45309]">
        Owner
      </span>
    )
  }
  if (role.is_system) {
    return (
      <span className="rounded-full bg-[#2c49a6]/12 px-2 py-0.5 text-[0.7rem] font-bold text-[#2c49a6]">
        System
      </span>
    )
  }
  return (
    <span className="rounded-full bg-[#168a66]/12 px-2 py-0.5 text-[0.7rem] font-bold text-[#168a66]">
      Custom
    </span>
  )
}

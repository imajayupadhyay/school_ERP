import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '@/features/admin/components/Modal'
import { TableErrorState } from '@/features/admin/components/TableUI'
import StatusPill from '../../components/StatusPill'
import { fetchSchool, setSchoolStatus } from '../api'
import type { PlatformSchool } from '../types'

const STATUS_ACTIONS: Record<string, { to: string; label: string; tone: string }[]> = {
  active: [
    { to: 'suspended', label: 'Suspend', tone: 'border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/[0.06]' },
    { to: 'inactive', label: 'Deactivate', tone: 'border-line text-ink/60 hover:border-ink/30' },
  ],
  suspended: [
    { to: 'active', label: 'Reactivate', tone: 'border-[#168a66]/30 text-[#168a66] hover:bg-[#168a66]/[0.06]' },
  ],
  inactive: [
    { to: 'active', label: 'Activate', tone: 'border-[#168a66]/30 text-[#168a66] hover:bg-[#168a66]/[0.06]' },
  ],
}

export default function SchoolDetailModal({
  schoolId,
  onClose,
  onEdit,
  onDelete,
}: {
  schoolId: number
  onClose: () => void
  onEdit: (school: PlatformSchool) => void
  onDelete: (school: PlatformSchool) => void
}) {
  const queryClient = useQueryClient()
  const { data: school, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform', 'schools', schoolId],
    queryFn: () => fetchSchool(schoolId),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => setSchoolStatus(schoolId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'schools'] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'dashboard'] })
      refetch()
    },
  })

  return (
    <Modal title={school?.name ?? 'School'} description={school ? `Code ${school.code}` : undefined} size="lg" onClose={onClose}>
      {isLoading ? (
        <div className="grid place-items-center py-16 text-ink/50">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
        </div>
      ) : isError || !school ? (
        <TableErrorState onRetry={() => refetch()} />
      ) : (
        <div className="space-y-5">
          {/* Header row: status + stats */}
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={school.status} />
            <Stat label="Students" value={school.students_count ?? 0} />
            <Stat label="Staff" value={school.employees_count ?? 0} />
            <Stat label="Users" value={school.users_count ?? 0} />
          </div>

          {/* Status actions */}
          <div className="flex flex-wrap items-center gap-2">
            {(STATUS_ACTIONS[school.status] ?? []).map((action) => (
              <button
                key={action.to}
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate(action.to)}
                className={`rounded-lg border bg-white px-3 py-1.5 text-[0.8rem] font-semibold transition disabled:opacity-50 ${action.tone}`}
              >
                {action.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onEdit(school)}
              className="ml-auto rounded-lg border border-line bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-accent transition hover:bg-accent/[0.06]"
            >
              Edit details
            </button>
          </div>

          {/* Profile */}
          <DetailGrid school={school} />

          {/* Owner admins */}
          <div>
            <h3 className="mb-2 text-[0.85rem] font-bold uppercase tracking-[0.06em] text-ink/55">Owner admins</h3>
            {school.admins && school.admins.length > 0 ? (
              <ul className="divide-y divide-line/70 rounded-xl border border-line">
                {school.admins.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-paper-2 to-paper text-[0.72rem] font-bold text-ink/60 ring-1 ring-line">
                      {a.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.86rem] font-semibold text-ink">{a.name}</p>
                      <p className="truncate text-[0.76rem] text-ink/45">{a.email}</p>
                    </div>
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[0.68rem] font-bold text-accent">{a.role_label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[0.84rem] text-ink/45">No owner admins found.</p>
            )}
          </div>

          {/* Danger zone */}
          <div className="flex flex-col gap-3 rounded-xl border border-[#dc2626]/25 bg-[#dc2626]/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[0.85rem] font-bold text-[#991b1b]">Delete this school</h3>
              <p className="mt-0.5 text-[0.78rem] text-[#b91c1c]/80">Permanently removes the school and all of its data.</p>
            </div>
            <button
              type="button"
              onClick={() => onDelete(school)}
              className="shrink-0 rounded-lg border border-[#dc2626]/40 bg-white px-3.5 py-2 text-[0.82rem] font-semibold text-[#dc2626] transition hover:bg-[#dc2626]/[0.06]"
            >
              Delete school
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-lg bg-paper-2/70 px-3 py-1.5">
      <span className="text-[0.95rem] font-extrabold text-ink tabular-nums">{value.toLocaleString()}</span>
      <span className="text-[0.72rem] font-medium text-ink/50">{label}</span>
    </span>
  )
}

function DetailGrid({ school }: { school: PlatformSchool }) {
  const rows: Array<[string, string | number | null]> = [
    ['Email', school.email],
    ['Phone', school.phone],
    ['Website', school.website],
    ['Board', school.board_affiliation],
    ['City', school.city],
    ['State', school.state],
    ['Country', school.country],
    ['Principal', school.principal_name],
    ['Established', school.established_year],
    ['Created', school.created_at ? new Date(school.created_at).toLocaleDateString() : null],
  ]
  return (
    <div className="grid gap-x-6 gap-y-3 rounded-xl border border-line bg-paper/40 p-4 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-3">
          <span className="text-[0.78rem] font-medium text-ink/45">{label}</span>
          <span className="truncate text-[0.84rem] font-semibold text-ink">{value || '—'}</span>
        </div>
      ))}
    </div>
  )
}

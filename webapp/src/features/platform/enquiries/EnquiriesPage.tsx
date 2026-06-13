import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/features/admin/components/PageHeader'
import { RowAction, TableSkeleton, TableErrorState } from '@/features/admin/components/TableUI'
import { inputClass } from '@/features/admin/components/FormField'
import Modal from '@/features/admin/components/Modal'
import {
  ClipboardUserIcon,
  FilterIcon,
  SearchIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/features/admin/components/icons'
import { deleteEnquiry, fetchEnquiries, updateEnquiryStatus } from './api'
import { ENQUIRY_STATUSES, type Enquiry } from './types'

const STATUS_TONES: Record<string, string> = {
  new: 'bg-accent/12 text-accent',
  contacted: 'bg-[#2c49a6]/12 text-[#2c49a6]',
  converted: 'bg-[#168a66]/12 text-[#168a66]',
  closed: 'bg-ink/10 text-ink/55',
}

export default function EnquiriesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Enquiry | null>(null)

  const params = { page, per_page: 15, search: search.trim() || undefined, status: status || undefined }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform', 'enquiries', params],
    queryFn: () => fetchEnquiries(params),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateEnquiryStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'enquiries'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEnquiry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'enquiries'] })
      setDeleteTarget(null)
    },
  })

  const rows = data?.items ?? []
  const meta = data?.meta
  const activeFilters = [search, status].filter(Boolean).length

  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardUserIcon}
        title="Enquiries"
        description="Sales leads captured from the public “Start Trial” enquiry form."
        aside={
          meta && (
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-paper/10 px-3 py-1 text-[0.78rem] font-semibold text-paper ring-1 ring-paper/15">
              <span className="text-lime">{meta.total}</span> total
              {meta.new_count > 0 && <span className="text-accent-2">· {meta.new_count} new</span>}
            </span>
          )
        }
      />

      {/* Filter toolbar */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
            <FilterIcon width={16} height={16} className="text-accent" />
            Filters
            {activeFilters > 0 && (
              <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[0.7rem] font-bold text-accent">{activeFilters} active</span>
            )}
          </div>
          {activeFilters > 0 && (
            <button onClick={resetFilters} className="text-[0.78rem] font-semibold text-ink/45 hover:text-accent">
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(1,minmax(0,1fr))]">
          <label className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={16} height={16} />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <select
            className={inputClass}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All statuses</option>
            {ENQUIRY_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <TableErrorState onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState filtered={activeFilters > 0} onClear={resetFilters} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">Name</th>
                  <th className="px-5 py-3.5 font-bold">Contact</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 font-bold">Received</th>
                  <th className="px-5 py-3.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-paper-2 to-paper text-[0.78rem] font-bold text-ink/60 ring-1 ring-line">
                          {e.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="truncate font-semibold text-ink">{e.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <a href={`mailto:${e.email}`} className="block truncate font-medium text-[#2c49a6] hover:underline">
                        {e.email}
                      </a>
                      <a href={`tel:${e.phone}`} className="mt-0.5 block text-[0.78rem] text-ink/55 hover:text-accent">
                        {e.phone}
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={e.status}
                        disabled={statusMutation.isPending}
                        onChange={(ev) => statusMutation.mutate({ id: e.id, status: ev.target.value })}
                        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-[0.72rem] font-bold capitalize outline-none focus:ring-2 focus:ring-accent/25 ${
                          STATUS_TONES[e.status] ?? 'bg-ink/10 text-ink/55'
                        }`}
                      >
                        {ENQUIRY_STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-white capitalize text-ink">
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-ink/60">
                      {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                        <RowAction label="Delete" danger onClick={() => setDeleteTarget(e)}>
                          <TrashIcon width={17} height={17} />
                        </RowAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[0.84rem] text-ink/55 shadow-sm">
              <span>
                Showing <b className="text-ink/75">{meta.from}</b>–<b className="text-ink/75">{meta.to}</b> of{' '}
                <b className="text-ink/75">{meta.total}</b>
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.current_page <= 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  <ChevronLeftIcon width={16} height={16} /> Prev
                </button>
                <span className="px-2 text-[0.8rem] font-semibold text-ink/45">
                  {meta.current_page} / {meta.last_page}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={meta.current_page >= meta.last_page}
                  className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  Next <ChevronRightIcon width={16} height={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <Modal title="Delete enquiry" description="This permanently removes the lead." onClose={() => setDeleteTarget(null)}>
          <p className="text-[0.9rem] text-ink/70">
            Delete the enquiry from <b className="text-ink">{deleteTarget.name}</b> ({deleteTarget.email})?
          </p>
          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-ink/30"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#dc2626] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:opacity-50"
            >
              {deleteMutation.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
        <ClipboardUserIcon width={30} height={30} />
      </span>
      <h3 className="mt-4 text-[1.05rem] font-bold text-ink">{filtered ? 'No enquiries match your filters' : 'No enquiries yet'}</h3>
      <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
        {filtered ? 'Try clearing the filters.' : 'New leads from the marketing site will appear here.'}
      </p>
      {filtered && (
        <button onClick={onClear} className="mt-4 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 hover:border-accent hover:text-accent">
          Clear filters
        </button>
      )}
    </div>
  )
}

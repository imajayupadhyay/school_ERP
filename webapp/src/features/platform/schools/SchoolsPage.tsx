import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/features/admin/components/PageHeader'
import { AddButton, RowAction, TableSkeleton, TableErrorState } from '@/features/admin/components/TableUI'
import { inputClass } from '@/features/admin/components/FormField'
import {
  ClassesIcon,
  FilterIcon,
  SearchIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/features/admin/components/icons'
import StatusPill from '../components/StatusPill'
import { fetchSchools } from './api'
import type { CreateSchoolResult, PlatformSchool } from './types'
import SchoolFormModal from './components/SchoolFormModal'
import SchoolDetailModal from './components/SchoolDetailModal'
import CreatedCredentialsModal from './components/CreatedCredentialsModal'
import DeleteSchoolModal from './components/DeleteSchoolModal'

const STATUS_FILTERS = ['active', 'inactive', 'suspended']

export default function SchoolsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const [formModal, setFormModal] = useState<{ mode: 'create' | 'edit'; school?: PlatformSchool } | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [credentials, setCredentials] = useState<CreateSchoolResult | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlatformSchool | null>(null)
  const [deletedName, setDeletedName] = useState<string | null>(null)

  const params = {
    page,
    per_page: 15,
    search: search.trim() || undefined,
    status: status || undefined,
  }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform', 'schools', params],
    queryFn: () => fetchSchools(params),
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
        icon={ClassesIcon}
        title="Schools"
        description="Create, view, and manage every school tenant on the platform."
        actions={<AddButton label="Add School" onClick={() => setFormModal({ mode: 'create' })} />}
        aside={
          meta && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1 text-[0.78rem] font-semibold text-paper ring-1 ring-paper/15">
              <span className="text-lime">{meta.total}</span> schools
            </span>
          )
        }
      />

      {deletedName && (
        <div className="flex items-center gap-2 rounded-xl border border-[#168a66]/25 bg-[#168a66]/[0.06] px-4 py-3 text-[0.85rem] text-[#0f6b50]">
          <CheckIcon width={16} height={16} />
          <span>
            <b>{deletedName}</b> and all of its data were permanently deleted.
          </span>
          <button onClick={() => setDeletedName(null)} className="ml-auto text-[0.78rem] font-semibold text-[#0f6b50]/70 hover:text-[#0f6b50]">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
            <FilterIcon width={16} height={16} className="text-accent" />
            Filters
            {activeFilters > 0 && (
              <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[0.7rem] font-bold text-accent">
                {activeFilters} active
              </span>
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
              placeholder="Search name, code, city…"
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
            {STATUS_FILTERS.map((s) => (
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
        <EmptyState filtered={activeFilters > 0} onClear={resetFilters} onAdd={() => setFormModal({ mode: 'create' })} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">School</th>
                  <th className="px-5 py-3.5 font-bold">Location</th>
                  <th className="px-5 py-3.5 text-right font-bold">Students</th>
                  <th className="px-5 py-3.5 text-right font-bold">Staff</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-paper-2 to-paper text-[0.82rem] font-bold text-ink/60 ring-1 ring-line transition group-hover:ring-accent/30">
                          {s.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{s.name}</p>
                          <p className="mt-0.5 text-[0.76rem] text-ink/45">{s.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink/70">{[s.city, s.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink/75">{(s.students_count ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink/75">{(s.employees_count ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                        <RowAction label="View" onClick={() => setDetailId(s.id)}>
                          <EyeIcon width={17} height={17} />
                        </RowAction>
                        <RowAction label="Edit" onClick={() => setFormModal({ mode: 'edit', school: s })}>
                          <EditIcon width={17} height={17} />
                        </RowAction>
                        <RowAction label="Delete" danger onClick={() => setDeleteTarget(s)}>
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

      {formModal && (
        <SchoolFormModal
          mode={formModal.mode}
          school={formModal.school}
          onClose={() => setFormModal(null)}
          onCreated={(result) => {
            setFormModal(null)
            setCredentials(result)
          }}
          onUpdated={() => setFormModal(null)}
        />
      )}

      {detailId !== null && (
        <SchoolDetailModal
          schoolId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(school) => {
            setDetailId(null)
            setFormModal({ mode: 'edit', school })
          }}
          onDelete={(school) => {
            setDetailId(null)
            setDeleteTarget(school)
          }}
        />
      )}

      {credentials && <CreatedCredentialsModal result={credentials} onClose={() => setCredentials(null)} />}

      {deleteTarget && (
        <DeleteSchoolModal
          school={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(name) => {
            setDeleteTarget(null)
            setDeletedName(name)
          }}
        />
      )}
    </div>
  )
}

function EmptyState({ filtered, onClear, onAdd }: { filtered: boolean; onClear: () => void; onAdd: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
        <ClassesIcon width={30} height={30} />
      </span>
      <h3 className="mt-4 text-[1.05rem] font-bold text-ink">{filtered ? 'No schools match your filters' : 'No schools yet'}</h3>
      <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
        {filtered ? 'Try clearing the filters to see all tenants.' : 'Create your first school tenant to get started.'}
      </p>
      <div className="mt-4">
        {filtered ? (
          <button onClick={onClear} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 hover:border-accent hover:text-accent">
            Clear filters
          </button>
        ) : (
          <AddButton label="Add School" onClick={onAdd} />
        )}
      </div>
    </div>
  )
}

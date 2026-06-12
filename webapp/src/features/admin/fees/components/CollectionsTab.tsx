import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchClasses } from '@/features/admin/academic-setup/api'
import { inputClass } from '../../components/FormField'
import StatusBadge from '../../components/StatusBadge'
import { ChevronLeftIcon, ChevronRightIcon, FilterIcon, SearchIcon } from '../../components/icons'
import { fetchFeeStudents } from '../api'
import { formatINR } from '../format'
import type { FeeStudentListParams } from '../types'
import { FeeErrorState, FeeTableSkeleton } from './FeeStates'
import StudentFeeDrawer from './StudentFeeDrawer'

const PER_PAGE = 15

export default function CollectionsTab({ canEdit }: { canEdit: boolean }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [drawerStudent, setDrawerStudent] = useState<number | null>(null)

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: fetchClasses })

  const params: FeeStudentListParams = {
    page,
    per_page: PER_PAGE,
    search: search.trim() || undefined,
    class_id: classFilter ? Number(classFilter) : undefined,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['fee-students', params],
    queryFn: () => fetchFeeStudents(params),
  })

  const rows = data?.items ?? []
  const meta = data?.meta
  const activeFilters = [search, classFilter].filter(Boolean).length

  return (
    <div className="space-y-4">
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
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setClassFilter('')
                setPage(1)
              }}
              className="text-[0.78rem] font-semibold text-ink/45 transition hover:text-accent"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(200px,1fr)_200px]">
          <label className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={17} height={17} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className={`${inputClass} pl-9`}
              placeholder="Search by name, admission no, roll"
            />
          </label>
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value)
              setPage(1)
            }}
            className={inputClass}
            aria-label="Class"
          >
            <option value="">All classes</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <FeeTableSkeleton />
      ) : isError ? (
        <FeeErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">Student</th>
                  <th className="px-4 py-3.5 font-bold">Class</th>
                  <th className="px-4 py-3.5 text-right font-bold">Billed</th>
                  <th className="px-4 py-3.5 text-right font-bold">Paid</th>
                  <th className="px-4 py-3.5 text-right font-bold">Outstanding</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">
                      No students match the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-paper-2 to-paper text-[0.76rem] font-bold text-ink/55 ring-1 ring-line transition group-hover:ring-accent/30">
                            {initials(row.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{row.full_name}</p>
                            <p className="text-[0.74rem] text-ink/45">{row.admission_no}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink/65">
                        {row.class_name ?? '—'}
                        {row.section ? ` · ${row.section}` : ''}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink/65">{formatINR(row.billed)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-[#168a66]">{formatINR(row.paid)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-bold ${row.outstanding > 0 ? 'text-ink' : 'text-ink/35'}`}>
                        {formatINR(row.outstanding)}
                      </td>
                      <td className="px-4 py-3">
                        {!row.has_plan ? (
                          <span className="rounded-full bg-ink/8 px-2.5 py-0.5 text-[0.72rem] font-semibold text-ink/45">No plan</span>
                        ) : row.overdue_count > 0 ? (
                          <StatusBadge status="overdue" />
                        ) : row.outstanding <= 0 ? (
                          <StatusBadge status="paid" />
                        ) : (
                          <StatusBadge status="pending" />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setDrawerStudent(row.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[0.76rem] font-semibold text-ink/65 transition hover:border-accent hover:bg-accent/5 hover:text-accent"
                          >
                            {canEdit ? 'Manage' : 'View'}
                            <ChevronRightIcon width={15} height={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && (
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[0.84rem] text-ink/55 shadow-sm">
              <span>
                Showing <span className="font-semibold text-ink/75">{meta.from ?? 0}–{meta.to ?? 0}</span> of{' '}
                <span className="font-semibold text-ink/75">{meta.total}</span>
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink/65"
                >
                  <ChevronLeftIcon width={16} height={16} />
                  Prev
                </button>
                <span className="px-2 text-[0.8rem] font-semibold text-ink/45">
                  {meta.current_page} / {meta.last_page}
                </span>
                <button
                  type="button"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))}
                  className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink/65"
                >
                  Next
                  <ChevronRightIcon width={16} height={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {drawerStudent !== null && (
        <StudentFeeDrawer studentId={drawerStudent} canEdit={canEdit} onClose={() => setDrawerStudent(null)} />
      )}
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

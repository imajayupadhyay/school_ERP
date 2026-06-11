import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchClasses } from '@/features/admin/academic-setup/api'
import { inputClass } from '../../components/FormField'
import StatusBadge from '../../components/StatusBadge'
import { fetchFeeStudents } from '../api'
import { formatINR } from '../format'
import type { FeeStudentListParams } from '../types'
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(200px,1fr)_180px_auto]">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className={inputClass}
            placeholder="Search by name, admission no, roll"
          />
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
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setClassFilter('')
              setPage(1)
            }}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
          >
            Reset
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-80 animate-pulse rounded-2xl bg-ink/5" />
      ) : isError ? (
        <div className="grid place-items-center rounded-2xl border border-line bg-white py-16">
          <button onClick={() => refetch()} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white">
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Billed</th>
                  <th className="px-4 py-3 font-semibold">Paid</th>
                  <th className="px-4 py-3 font-semibold">Outstanding</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-ink/40">
                      No students match the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-line/60 last:border-0 hover:bg-paper/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">{row.full_name}</p>
                        <p className="text-[0.74rem] text-ink/45">{row.admission_no}</p>
                      </td>
                      <td className="px-4 py-3 text-ink/65">
                        {row.class_name ?? '—'}
                        {row.section ? ` · ${row.section}` : ''}
                      </td>
                      <td className="px-4 py-3 text-ink/65">{formatINR(row.billed)}</td>
                      <td className="px-4 py-3 text-ink/65">{formatINR(row.paid)}</td>
                      <td className={`px-4 py-3 font-medium ${row.outstanding > 0 ? 'text-ink' : 'text-ink/45'}`}>
                        {formatINR(row.outstanding)}
                      </td>
                      <td className="px-4 py-3">
                        {!row.has_plan ? (
                          <span className="text-[0.74rem] text-ink/40">No plan</span>
                        ) : row.overdue_count > 0 ? (
                          <StatusBadge status="overdue" />
                        ) : row.outstanding <= 0 ? (
                          <StatusBadge status="paid" />
                        ) : (
                          <StatusBadge status="pending" />
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDrawerStudent(row.id)}
                          className="rounded-lg border border-line bg-white px-3 py-1.5 text-[0.76rem] font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
                        >
                          {canEdit ? 'Manage' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && (
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[0.84rem] text-ink/55">
              <span>
                Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="rounded-xl border border-line bg-white px-4 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))}
                  className="rounded-xl border border-line bg-white px-4 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  Next
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

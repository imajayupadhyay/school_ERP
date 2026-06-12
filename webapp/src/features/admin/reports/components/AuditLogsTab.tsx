import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, FilterIcon, SearchIcon } from '../../components/icons'
import { RowAction, TableErrorState, TableSkeleton } from '../../components/TableUI'
import { fetchAuditLogSummary, fetchAuditLogs } from '../api'
import type { AuditLog } from '../types'
import { formatDateTime, formatNumber, moduleLabel, monthStartInputValue, todayInputValue } from '../utils'

const PER_PAGE = 15
const AUDIT_MODULES = [
  'student',
  'guardian',
  'employee',
  'attendance',
  'fee_head',
  'fee_structure',
  'student_fee',
  'fee_payment',
  'exam',
  'exam_schedule',
  'exam_marks',
  'exam_results',
  'homework',
  'study_material',
  'notice',
  'academic_session',
  'class',
  'section',
  'subject',
  'school_profile',
]

export default function AuditLogsTab() {
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState(monthStartInputValue())
  const [to, setTo] = useState(todayInputValue())
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('')
  const [action, setAction] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const params = {
    page,
    per_page: PER_PAGE,
    from,
    to,
    search: search.trim() || undefined,
    module: module || undefined,
    action: action.trim() || undefined,
  }
  const summaryParams = { ...params, page: undefined, per_page: undefined }

  const logsQuery = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => fetchAuditLogs(params),
    enabled: !!from && !!to,
  })
  const summaryQuery = useQuery({
    queryKey: ['audit-log-summary', summaryParams],
    queryFn: () => fetchAuditLogSummary(summaryParams),
    enabled: !!from && !!to,
  })

  const data = logsQuery.data
  const logs = data?.items ?? []
  const summary = summaryQuery.data
  const activeFilters = [search, module, action].filter(Boolean).length

  const resetFilters = () => {
    setSearch('')
    setModule('')
    setAction('')
    setPage(1)
  }

  return (
    <div className="space-y-5">
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
            <button type="button" onClick={resetFilters} className="text-[0.78rem] font-semibold text-ink/45 transition hover:text-accent">
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(190px,0.8fr)_minmax(190px,0.8fr)_minmax(240px,1.2fr)_minmax(190px,0.85fr)_minmax(240px,1.2fr)]">
          <label className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={16} height={16} />
            <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1) }} className={`${inputClass} pl-9`} aria-label="From date" />
          </label>
          <label className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={16} height={16} />
            <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1) }} className={`${inputClass} pl-9`} aria-label="To date" />
          </label>
          <label className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={17} height={17} />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className={`${inputClass} pl-9`} placeholder="Actor, action, IP" aria-label="Search audit logs" />
          </label>
          <select value={module} onChange={(event) => { setModule(event.target.value); setPage(1) }} className={inputClass} aria-label="Module">
            <option value="">All modules</option>
            {AUDIT_MODULES.map((item) => (
              <option key={item} value={item}>{moduleLabel(item)}</option>
            ))}
          </select>
          <input value={action} onChange={(event) => { setAction(event.target.value); setPage(1) }} className={inputClass} placeholder="Exact action, e.g. student.created" aria-label="Exact action" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Events" value={formatNumber(summary?.total ?? 0)} detail={`${formatNumber(summary?.actors ?? 0)} actors`} tone="accent" loading={summaryQuery.isLoading} />
        <SummaryCard label="Top Module" value={moduleLabel(summary?.modules[0]?.module)} detail={`${formatNumber(summary?.modules[0]?.count ?? 0)} events`} tone="blue" loading={summaryQuery.isLoading} />
        <SummaryCard label="Second Module" value={moduleLabel(summary?.modules[1]?.module)} detail={`${formatNumber(summary?.modules[1]?.count ?? 0)} events`} tone="ink" loading={summaryQuery.isLoading} />
        <SummaryCard label="Top Actor" value={summary?.top_actors[0]?.name ?? '—'} detail={`${formatNumber(summary?.top_actors[0]?.count ?? 0)} events`} tone="gold" loading={summaryQuery.isLoading} />
      </div>

      {logsQuery.isLoading ? (
        <TableSkeleton rows={6} />
      ) : logsQuery.isError ? (
        <TableErrorState message={extractErrorMessage(logsQuery.error)} onRetry={() => logsQuery.refetch()} title="Unable to load audit logs" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full min-w-[980px] text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">Activity</th>
                  <th className="px-4 py-3.5 font-bold">Actor</th>
                  <th className="px-4 py-3.5 font-bold">Target</th>
                  <th className="px-4 py-3.5 font-bold">Changes</th>
                  <th className="px-4 py-3.5 font-bold">IP</th>
                  <th className="px-4 py-3.5 font-bold">Time</th>
                  <th className="px-5 py-3.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">No audit events match the current filters.</td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-ink">{log.action_label}</p>
                      <div className="mt-1 flex items-center gap-2 text-[0.73rem] text-ink/45">
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 font-bold text-accent">{moduleLabel(log.module)}</span>
                        <span>{log.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink/75">{log.actor?.name ?? 'System'}</p>
                      <p className="mt-0.5 text-[0.73rem] text-ink/40">{log.actor?.role ?? 'No user'}</p>
                    </td>
                    <td className="px-4 py-3 text-ink/60">
                      {log.auditable.type ? `${log.auditable.type} #${log.auditable.id ?? '—'}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink/65">{log.changes_count} fields</p>
                      <p className="mt-0.5 max-w-[180px] truncate text-[0.73rem] text-ink/40">{log.changed_fields.join(', ') || 'No diff'}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink/55">{log.ip_address ?? '—'}</td>
                    <td className="px-4 py-3 text-ink/60">{formatDateTime(log.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end opacity-80 transition-opacity group-hover:opacity-100">
                        <RowAction label="View details" onClick={() => setSelectedLog(log)}>
                          <EyeIcon width={17} height={17} />
                        </RowAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[0.84rem] text-ink/55 shadow-sm">
              <span>Showing <span className="font-semibold text-ink/75">{data.meta.from ?? 0}–{data.meta.to ?? 0}</span> of <span className="font-semibold text-ink/75">{data.meta.total}</span></span>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink/65">
                  <ChevronLeftIcon width={16} height={16} />
                  Prev
                </button>
                <span className="px-2 text-[0.8rem] font-semibold text-ink/45">{data.meta.current_page} / {data.meta.last_page}</span>
                <button type="button" disabled={page >= data.meta.last_page} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink/65">
                  Next
                  <ChevronRightIcon width={16} height={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedLog && <AuditLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  )
}

type Tone = 'ink' | 'accent' | 'blue' | 'gold'

function SummaryCard({
  label,
  value,
  detail,
  tone,
  loading,
}: {
  label: string
  value: string
  detail: string
  tone: Tone
  loading: boolean
}) {
  const styles: Record<Tone, { dot: string; value: string; card: string }> = {
    ink: { dot: 'bg-ink/30', value: 'text-ink', card: 'border-line bg-white' },
    accent: { dot: 'bg-accent', value: 'text-accent', card: 'border-accent/25 bg-accent/[0.06]' },
    blue: { dot: 'bg-[#2c49a6]', value: 'text-[#2c49a6]', card: 'border-line bg-white' },
    gold: { dot: 'bg-[#d6991f]', value: 'text-[#b45309]', card: 'border-line bg-white' },
  }
  const style = styles[tone]

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${style.card}`}>
      {loading ? (
        <div className="space-y-3">
          <div className="h-3 w-24 animate-pulse rounded bg-ink/10" />
          <div className="h-6 w-32 animate-pulse rounded bg-ink/10" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            <p className="truncate text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</p>
          </div>
          <p className={`mt-1.5 truncate text-[1.35rem] font-extrabold leading-tight ${style.value}`}>{value}</p>
          <p className="mt-0.5 truncate text-[0.75rem] font-medium text-ink/45">{detail}</p>
        </>
      )}
    </div>
  )
}

function AuditLogDetailModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const rows = Object.entries(log.changes ?? {})

  return (
    <Modal title="Audit Details" description={`${log.action_label} · ${formatDateTime(log.created_at)}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailTile label="Actor" value={log.actor ? `${log.actor.name} · ${log.actor.role}` : 'System'} />
          <DetailTile label="Module" value={moduleLabel(log.module)} />
          <DetailTile label="Action" value={log.action} />
          <DetailTile label="Target" value={log.auditable.type ? `${log.auditable.type} #${log.auditable.id ?? '—'}` : '—'} />
          <DetailTile label="IP Address" value={log.ip_address ?? '—'} />
          <DetailTile label="Recorded" value={formatDateTime(log.created_at)} />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-[0.84rem]">
            <thead>
              <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                <th className="px-5 py-3.5 font-bold">Field</th>
                <th className="px-4 py-3.5 font-bold">Old</th>
                <th className="px-4 py-3.5 font-bold">New</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-[0.86rem] text-ink/40">No field-level diff was recorded.</td>
                </tr>
              ) : rows.map(([field, change]) => {
                const diff = normalizeChange(change)
                return (
                  <tr key={field} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-3 font-semibold text-ink">{field}</td>
                    <td className="max-w-[240px] px-4 py-3 text-ink/55"><pre className="whitespace-pre-wrap break-words font-[inherit]">{formatValue(diff.old)}</pre></td>
                    <td className="max-w-[240px] px-4 py-3 text-ink/75"><pre className="whitespace-pre-wrap break-words font-[inherit]">{formatValue(diff.new)}</pre></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper/45 px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</p>
      <p className="mt-1 break-words text-[0.86rem] font-semibold text-ink/75">{value}</p>
    </div>
  )
}

function normalizeChange(value: unknown): { old: unknown; new: unknown } {
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (Object.prototype.hasOwnProperty.call(record, 'old') || Object.prototype.hasOwnProperty.call(record, 'new')) {
      return { old: record.old, new: record.new }
    }
  }

  return { old: null, new: value }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number' || typeof value === 'string') return String(value)

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

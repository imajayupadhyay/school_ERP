import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon, FilterIcon } from '../../components/icons'
import type { AcademicSession, SchoolClass } from '../AttendancePage'
import { fetchAttendanceSession, fetchAttendanceSessions } from '../api'
import type { AttendanceSession } from '../types'

const PER_PAGE = 15

interface SessionsTabProps {
  academicSessions: AcademicSession[]
  classes: SchoolClass[]
  onOpenSession: (session: AttendanceSession) => void
  isSetupLoading: boolean
}

export default function SessionsTab({ academicSessions, classes, onOpenSession, isSetupLoading }: SessionsTabProps) {
  const [page, setPage] = useState(1)
  const [academicSessionId, setAcademicSessionId] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)

  const selectedClass = useMemo(
    () => classes.find((schoolClass) => String(schoolClass.id) === classId) ?? null,
    [classes, classId],
  )

  const params = {
    page,
    per_page: PER_PAGE,
    academic_session_id: academicSessionId ? Number(academicSessionId) : undefined,
    class_id: classId ? Number(classId) : undefined,
    section_id: sectionId ? Number(sectionId) : undefined,
    date: date || undefined,
    status: status || undefined,
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['attendance-sessions', params],
    queryFn: () => fetchAttendanceSessions(params),
  })

  const selectedSessionQuery = useQuery({
    queryKey: ['attendance-session', selectedSessionId],
    queryFn: () => fetchAttendanceSession(selectedSessionId!),
    enabled: selectedSessionId !== null,
  })

  const rows = data?.items ?? []
  const meta = data?.meta

  const resetFilters = () => {
    setAcademicSessionId('')
    setClassId('')
    setSectionId('')
    setDate('')
    setStatus('')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
          <FilterIcon width={16} height={16} className="text-accent" />
          Filters
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_150px_150px_150px_auto]">
          <select
            value={academicSessionId}
            onChange={(event) => {
              setAcademicSessionId(event.target.value)
              setPage(1)
            }}
            className={inputClass}
            disabled={isSetupLoading}
            aria-label="Academic session"
          >
            <option value="">All sessions</option>
            {academicSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>

          <select
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value)
              setSectionId('')
              setPage(1)
            }}
            className={inputClass}
            disabled={isSetupLoading}
            aria-label="Class"
          >
            <option value="">All classes</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </select>

          <select
            value={sectionId}
            onChange={(event) => {
              setSectionId(event.target.value)
              setPage(1)
            }}
            className={inputClass}
            disabled={!selectedClass}
            aria-label="Section"
          >
            <option value="">All sections</option>
            {selectedClass?.sections.map((section) => (
              <option key={section.id} value={section.id}>
                Section {section.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
              setPage(1)
            }}
            className={inputClass}
            aria-label="Date"
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className={inputClass}
            aria-label="Status"
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="draft">Draft</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
          >
            Reset
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-80 animate-pulse rounded-2xl bg-ink/[0.05]" />
      ) : isError ? (
        <div className="grid place-items-center rounded-2xl border border-line bg-white px-5 py-14 shadow-sm">
          <div className="text-center">
            <p className="text-[0.9rem] font-semibold text-ink">Unable to load attendance sessions</p>
            <p className="mt-1 text-[0.82rem] text-ink/50">{extractErrorMessage(error)}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">Date</th>
                  <th className="px-4 py-3.5 font-bold">Class</th>
                  <th className="px-4 py-3.5 font-bold">Marked By</th>
                  <th className="px-4 py-3.5 font-bold">Summary</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">
                      No attendance sessions match the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((session) => (
                    <tr key={session.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                      <td className="px-5 py-3 font-semibold text-ink">{session.attendance_date}</td>
                      <td className="px-4 py-3 text-ink/65">
                        {session.class?.name ?? '—'}
                        {session.section ? ` · ${session.section.name}` : ''}
                      </td>
                      <td className="px-4 py-3 text-ink/55">{session.marker?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <SummaryChip value={session.summary.present} label="P" tone="success" />
                          <SummaryChip value={session.summary.absent} label="A" tone="danger" />
                          <SummaryChip value={session.summary.late} label="L" tone="warn" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end opacity-80 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setSelectedSessionId(session.id)}
                            title="View session"
                            aria-label="View session"
                            className="grid h-8 w-8 place-items-center rounded-lg bg-[#2c49a6]/12 text-[#2c49a6] transition hover:scale-110 hover:bg-[#2c49a6]/22"
                          >
                            <EyeIcon width={17} height={17} />
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
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
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
                  onClick={() => setPage((current) => Math.min(current + 1, meta.last_page))}
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

      {selectedSessionId !== null && (
        <Modal title="Attendance Session" description="Student-level attendance recorded for this roster." size="lg" onClose={() => setSelectedSessionId(null)}>
          {selectedSessionQuery.isLoading ? (
            <div className="h-64 animate-pulse rounded-xl bg-ink/5" />
          ) : selectedSessionQuery.isError ? (
            <div className="rounded-xl border border-line bg-paper-2/60 px-4 py-8 text-center text-[0.85rem] text-ink/55">
              {extractErrorMessage(selectedSessionQuery.error)}
            </div>
          ) : selectedSessionQuery.data ? (
            <SessionDetail session={selectedSessionQuery.data} onOpenSession={onOpenSession} />
          ) : null}
        </Modal>
      )}
    </div>
  )
}

function SessionDetail({ session, onOpenSession }: { session: AttendanceSession; onOpenSession: (session: AttendanceSession) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <DetailStat label="Total" value={session.summary.total} />
        <DetailStat label="Present" value={session.summary.present} />
        <DetailStat label="Absent" value={session.summary.absent} />
        <DetailStat label="Late" value={session.summary.late} />
        <DetailStat label="Excused" value={session.summary.excused + session.summary.half_day} />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-paper/50 px-4 py-3 text-[0.84rem] text-ink/60 sm:flex-row sm:items-center">
        <span className="font-semibold text-ink">
          {session.class?.name ?? 'Class'} {session.section ? `· Section ${session.section.name}` : ''}
        </span>
        <span>{session.attendance_date}</span>
        <span className="sm:ml-auto">{session.marker?.name ?? 'Not recorded'}</span>
      </div>

      <div className="max-h-[45vh] overflow-auto rounded-xl border border-line">
        <table className="w-full text-left text-[0.84rem]">
          <thead>
            <tr className="border-b border-line bg-paper/70 text-[0.72rem] uppercase tracking-wider text-ink/45">
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-3 py-3 font-semibold">Roll</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {(session.records ?? []).map((record) => (
              <tr key={record.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{record.student?.full_name ?? 'Student'}</p>
                  <p className="text-[0.72rem] text-ink/45">{record.student?.admission_no ?? '—'}</p>
                </td>
                <td className="px-3 py-3 text-ink/55">{record.student?.roll_no ?? '—'}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={record.status} />
                </td>
                <td className="px-4 py-3 text-ink/55">{record.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onOpenSession(session)}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
        >
          Open Roster
        </button>
      </div>
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p className="mt-1 text-[1.2rem] font-extrabold text-ink">{value}</p>
    </div>
  )
}

function SummaryChip({ value, label, tone }: { value: number; label: string; tone: 'success' | 'danger' | 'warn' }) {
  const cls =
    tone === 'success'
      ? 'bg-[#168a66]/10 text-[#168a66]'
      : tone === 'danger'
        ? 'bg-[#dc2626]/10 text-[#dc2626]'
        : 'bg-lime/15 text-[#b45309]'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-bold ${cls}`}>
      <span className="opacity-60">{label}</span>
      {value}
    </span>
  )
}

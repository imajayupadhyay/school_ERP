import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
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
      <div className="rounded-2xl border border-line bg-white p-4">
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
        <div className="h-80 animate-pulse rounded-2xl bg-ink/5" />
      ) : isError ? (
        <div className="grid place-items-center rounded-2xl border border-line bg-white px-5 py-14">
          <div className="text-center">
            <p className="text-[0.9rem] font-semibold text-ink">Unable to load attendance sessions</p>
            <p className="mt-1 text-[0.82rem] text-ink/50">{extractErrorMessage(error)}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Marked By</th>
                  <th className="px-4 py-3 font-semibold">Summary</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-ink/40">
                      No attendance sessions match the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((session) => (
                    <tr key={session.id} className="border-b border-line/60 last:border-0 hover:bg-paper/50">
                      <td className="px-5 py-3 font-medium text-ink">{session.attendance_date}</td>
                      <td className="px-4 py-3 text-ink/65">
                        {session.class?.name ?? '—'}
                        {session.section ? ` · ${session.section.name}` : ''}
                      </td>
                      <td className="px-4 py-3 text-ink/55">{session.marker?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-ink/65">
                        {session.summary.present} present · {session.summary.absent} absent · {session.summary.late} late
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSessionId(session.id)}
                          className="rounded-lg border border-line bg-white px-3 py-1.5 text-[0.76rem] font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
                        >
                          View
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
                Showing {meta.from ?? 0}-{meta.to ?? 0} of {meta.total}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  className="rounded-xl border border-line bg-white px-4 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((current) => Math.min(current + 1, meta.last_page))}
                  className="rounded-xl border border-line bg-white px-4 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  Next
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
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(238,106,44,.24)] transition hover:bg-accent-dark"
        >
          Open Roster
        </button>
      </div>
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p className="mt-1 text-[1.2rem] font-extrabold text-ink">{value}</p>
    </div>
  )
}

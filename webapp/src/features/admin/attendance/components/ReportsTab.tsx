import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import { inputClass } from '../../components/FormField'
import { CalendarIcon, FilterIcon } from '../../components/icons'
import type { AcademicSession, SchoolClass } from '../AttendancePage'
import { fetchAttendanceSummary } from '../api'
import { attendedCount, monthStartInputValue, todayInputValue } from '../utils'

interface ReportsTabProps {
  academicSessions: AcademicSession[]
  classes: SchoolClass[]
  isSetupLoading: boolean
}

export default function ReportsTab({ academicSessions, classes, isSetupLoading }: ReportsTabProps) {
  const [from, setFrom] = useState(monthStartInputValue())
  const [to, setTo] = useState(todayInputValue())
  const [academicSessionId, setAcademicSessionId] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')

  const selectedClass = useMemo(
    () => classes.find((schoolClass) => String(schoolClass.id) === classId) ?? null,
    [classes, classId],
  )

  const params = {
    from,
    to,
    academic_session_id: academicSessionId ? Number(academicSessionId) : undefined,
    class_id: classId ? Number(classId) : undefined,
    section_id: sectionId ? Number(sectionId) : undefined,
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['attendance-summary', params],
    queryFn: () => fetchAttendanceSummary(params),
    enabled: !!from && !!to,
  })

  const summary = data?.summary ?? {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    half_day: 0,
    excused: 0,
  }
  const attendanceRate = summary.total > 0 ? Math.round((attendedCount(summary) / summary.total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
          <FilterIcon width={16} height={16} className="text-accent" />
          Report range &amp; scope
        </div>
        <div className="grid gap-3 lg:grid-cols-[150px_150px_minmax(160px,1fr)_minmax(160px,1fr)_150px]">
          <label className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={16} height={16} />
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={`${inputClass} pl-9`}
              aria-label="From date"
            />
          </label>
          <label className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={16} height={16} />
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={`${inputClass} pl-9`}
              aria-label="To date"
            />
          </label>
          <select
            value={academicSessionId}
            onChange={(event) => setAcademicSessionId(event.target.value)}
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
            onChange={(event) => setSectionId(event.target.value)}
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
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[72px] animate-pulse rounded-2xl bg-ink/[0.05]" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-ink/[0.05]" />
        </div>
      ) : isError ? (
        <div className="grid place-items-center rounded-2xl border border-line bg-white px-5 py-14 shadow-sm">
          <div className="text-center">
            <p className="text-[0.9rem] font-semibold text-ink">Unable to load attendance report</p>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <ReportCard label="Sessions" value={data?.sessions_count ?? 0} tone="ink" />
            <ReportCard label="Records" value={summary.total} tone="ink" />
            <ReportCard label="Present" value={summary.present} tone="success" />
            <ReportCard label="Absent" value={summary.absent} tone="danger" />
            <ReportCard label="Late" value={summary.late} tone="warn" />
            <ReportCard label="Rate" value={`${attendanceRate}%`} tone="accent" />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">Student</th>
                  <th className="px-4 py-3.5 font-bold">Class</th>
                  <th className="px-4 py-3.5 font-bold">Present</th>
                  <th className="px-4 py-3.5 font-bold">Absent</th>
                  <th className="px-4 py-3.5 font-bold">Late</th>
                  <th className="px-4 py-3.5 font-bold">Excused</th>
                  <th className="px-5 py-3.5 font-bold">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">
                      No attendance records found for this range.
                    </td>
                  </tr>
                ) : (
                  data?.items.map((item) => (
                    <tr key={item.student_id ?? `${item.full_name}-${item.roll_no}`} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-ink">{item.full_name ?? 'Student'}</p>
                        <p className="text-[0.74rem] text-ink/45">{item.admission_no ?? 'No admission no'}</p>
                      </td>
                      <td className="px-4 py-3 text-ink/65">
                        {item.class_name ?? '—'}
                        {item.section ? ` · ${item.section}` : ''}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#168a66]">{item.present}</td>
                      <td className="px-4 py-3 font-semibold text-[#dc2626]">{item.absent}</td>
                      <td className="px-4 py-3 font-semibold text-[#b45309]">{item.late}</td>
                      <td className="px-4 py-3 text-ink/65">{item.excused + item.half_day}</td>
                      <td className="px-5 py-3">
                        <PercentBar value={item.attendance_percentage} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

type ReportTone = 'ink' | 'success' | 'danger' | 'warn' | 'accent'

function ReportCard({ label, value, tone = 'ink' }: { label: string; value: number | string; tone?: ReportTone }) {
  const map: Record<ReportTone, { value: string; dot: string; card: string }> = {
    ink: { value: 'text-ink', dot: 'bg-ink/30', card: 'border-line bg-white' },
    success: { value: 'text-[#168a66]', dot: 'bg-[#168a66]', card: 'border-line bg-white' },
    danger: { value: 'text-[#dc2626]', dot: 'bg-[#dc2626]', card: 'border-line bg-white' },
    warn: { value: 'text-[#b45309]', dot: 'bg-[#d6991f]', card: 'border-line bg-white' },
    accent: { value: 'text-accent', dot: 'bg-accent', card: 'border-accent/25 bg-accent/[0.06]' },
  }
  const styles = map[tone]
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${styles.card}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      </div>
      <p className={`mt-1.5 text-[1.5rem] font-extrabold leading-none ${styles.value}`}>{value}</p>
    </div>
  )
}

function PercentBar({ value }: { value: number }) {
  const tone = value >= 85 ? 'bg-[#168a66]' : value >= 60 ? 'bg-[#d6991f]' : 'bg-[#dc2626]'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full ${tone} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-[0.82rem] font-bold text-ink">{value}%</span>
    </div>
  )
}

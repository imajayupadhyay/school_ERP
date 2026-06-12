import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import { inputClass } from '../../components/FormField'
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
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[150px_150px_minmax(160px,1fr)_minmax(160px,1fr)_150px]">
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={inputClass}
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={inputClass}
            aria-label="To date"
          />
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
        <div className="h-80 animate-pulse rounded-2xl bg-ink/5" />
      ) : isError ? (
        <div className="grid place-items-center rounded-2xl border border-line bg-white px-5 py-14">
          <div className="text-center">
            <p className="text-[0.9rem] font-semibold text-ink">Unable to load attendance report</p>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <ReportCard label="Sessions" value={data?.sessions_count ?? 0} />
            <ReportCard label="Records" value={summary.total} />
            <ReportCard label="Present" value={summary.present} />
            <ReportCard label="Absent" value={summary.absent} tone="danger" />
            <ReportCard label="Late" value={summary.late} tone="warn" />
            <ReportCard label="Rate" value={`${attendanceRate}%`} />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Present</th>
                  <th className="px-4 py-3 font-semibold">Absent</th>
                  <th className="px-4 py-3 font-semibold">Late</th>
                  <th className="px-4 py-3 font-semibold">Excused</th>
                  <th className="px-5 py-3 text-right font-semibold">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-ink/40">
                      No attendance records found for this range.
                    </td>
                  </tr>
                ) : (
                  data?.items.map((item) => (
                    <tr key={item.student_id ?? `${item.full_name}-${item.roll_no}`} className="border-b border-line/60 last:border-0 hover:bg-paper/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">{item.full_name ?? 'Student'}</p>
                        <p className="text-[0.74rem] text-ink/45">{item.admission_no ?? 'No admission no'}</p>
                      </td>
                      <td className="px-4 py-3 text-ink/65">
                        {item.class_name ?? '—'}
                        {item.section ? ` · ${item.section}` : ''}
                      </td>
                      <td className="px-4 py-3 text-ink/65">{item.present}</td>
                      <td className="px-4 py-3 text-[#dc2626]">{item.absent}</td>
                      <td className="px-4 py-3 text-[#b45309]">{item.late}</td>
                      <td className="px-4 py-3 text-ink/65">{item.excused + item.half_day}</td>
                      <td className="px-5 py-3 text-right font-semibold text-ink">{item.attendance_percentage}%</td>
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

function ReportCard({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'danger' | 'warn' }) {
  const valueClass =
    tone === 'danger' ? 'text-[#dc2626]' : tone === 'warn' ? 'text-[#b45309]' : 'text-ink'

  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p className={`mt-1 text-[1.35rem] font-extrabold ${valueClass}`}>{value}</p>
    </div>
  )
}

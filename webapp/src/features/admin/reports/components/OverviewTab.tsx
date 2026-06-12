import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import type { AcademicSession, SchoolClass } from '../../academic-setup/types'
import { formatINR } from '../../fees/format'
import { inputClass } from '../../components/FormField'
import { CalendarIcon, FilterIcon } from '../../components/icons'
import { TableErrorState, TableSkeleton } from '../../components/TableUI'
import { fetchReportOverview } from '../api'
import type { ActivityPoint, AttendanceByClass, ExamByClass, FeeByClass } from '../types'
import { formatNumber, monthStartInputValue, todayInputValue } from '../utils'

interface OverviewTabProps {
  academicSessions: AcademicSession[]
  classes: SchoolClass[]
  isSetupLoading: boolean
}

export default function OverviewTab({ academicSessions, classes, isSetupLoading }: OverviewTabProps) {
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

  const reportQuery = useQuery({
    queryKey: ['reports-overview', params],
    queryFn: () => fetchReportOverview(params),
    enabled: !!from && !!to,
  })

  const activeFilters = [from, to, academicSessionId, classId, sectionId].filter(Boolean).length
  const resetFilters = () => {
    setFrom(monthStartInputValue())
    setTo(todayInputValue())
    setAcademicSessionId('')
    setClassId('')
    setSectionId('')
  }

  const report = reportQuery.data

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
            <FilterIcon width={16} height={16} className="text-accent" />
            Report range &amp; scope
            {activeFilters > 2 && (
              <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[0.7rem] font-bold text-accent">
                {activeFilters - 2} scoped
              </span>
            )}
          </div>
          {activeFilters > 2 && (
            <button type="button" onClick={resetFilters} className="text-[0.78rem] font-semibold text-ink/45 transition hover:text-accent">
              Clear scope
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(190px,0.8fr)_minmax(190px,0.8fr)_minmax(240px,1.25fr)_minmax(240px,1.25fr)_minmax(190px,0.85fr)]">
          <label className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={16} height={16} />
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={`${inputClass} pl-9`} aria-label="From date" />
          </label>
          <label className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={16} height={16} />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={`${inputClass} pl-9`} aria-label="To date" />
          </label>
          <select value={academicSessionId} onChange={(event) => setAcademicSessionId(event.target.value)} className={inputClass} disabled={isSetupLoading} aria-label="Academic session">
            <option value="">All sessions</option>
            {academicSessions.map((session) => (
              <option key={session.id} value={session.id}>{session.name}</option>
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
              <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
            ))}
          </select>
          <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} className={inputClass} disabled={!selectedClass} aria-label="Section">
            <option value="">All sections</option>
            {selectedClass?.sections.map((section) => (
              <option key={section.id} value={section.id}>Section {section.name}</option>
            ))}
          </select>
        </div>
      </div>

      {reportQuery.isLoading ? (
        <OverviewSkeleton />
      ) : reportQuery.isError ? (
        <TableErrorState message={extractErrorMessage(reportQuery.error)} onRetry={() => reportQuery.refetch()} title="Unable to load reports" />
      ) : report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active Students" value={formatNumber(report.students.active)} detail={`${formatNumber(report.students.new_admissions)} new`} tone="ink" />
            <MetricCard label="Fee Billed" value={formatINR(report.fees.billed)} detail={`${report.fees.invoices} invoices`} tone="accent" />
            <MetricCard label="Collected" value={formatINR(report.fees.collected)} detail={`${report.fees.collection_rate}% of billed`} tone="success" />
            <MetricCard label="Outstanding" value={formatINR(report.fees.outstanding)} detail={`${formatINR(report.fees.overdue)} overdue`} tone="danger" />
            <MetricCard label="Attendance" value={`${report.attendance.attendance_rate}%`} detail={`${formatNumber(report.attendance.records)} records`} tone="success" />
            <MetricCard label="Results" value={`${report.exams.pass_rate}%`} detail={`${formatNumber(report.exams.published_results)} published`} tone="gold" />
            <MetricCard label="Learning" value={formatNumber(report.learning.homework + report.learning.study_materials)} detail={`${formatNumber(report.learning.notices_published)} notices`} tone="ink" />
            <MetricCard label="Audit Events" value={formatNumber(report.audit.events)} detail={`${formatNumber(report.audit.actors)} actors`} tone="blue" />
          </div>

          <ActivityBars points={report.activity_trend} />

          <FeeByClassTable rows={report.fee_by_class} />
          <AttendanceByClassTable rows={report.attendance_by_class} />
          <ExamByClassTable rows={report.exam_by_class} />
        </>
      ) : null}
    </div>
  )
}

type Tone = 'ink' | 'accent' | 'success' | 'danger' | 'gold' | 'blue'

function MetricCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: Tone }) {
  const styles: Record<Tone, { dot: string; value: string; card: string }> = {
    ink: { dot: 'bg-ink/30', value: 'text-ink', card: 'border-line bg-white' },
    accent: { dot: 'bg-accent', value: 'text-accent', card: 'border-accent/25 bg-accent/[0.06]' },
    success: { dot: 'bg-[#168a66]', value: 'text-[#168a66]', card: 'border-line bg-white' },
    danger: { dot: 'bg-[#dc2626]', value: 'text-[#dc2626]', card: 'border-line bg-white' },
    gold: { dot: 'bg-[#d6991f]', value: 'text-[#b45309]', card: 'border-line bg-white' },
    blue: { dot: 'bg-[#2c49a6]', value: 'text-[#2c49a6]', card: 'border-line bg-white' },
  }
  const style = styles[tone]

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${style.card}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <p className="truncate text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</p>
      </div>
      <p className={`mt-1.5 truncate text-[1.35rem] font-extrabold leading-tight ${style.value}`}>{value}</p>
      <p className="mt-0.5 truncate text-[0.75rem] font-medium text-ink/45">{detail}</p>
    </div>
  )
}

function ActivityBars({ points }: { points: ActivityPoint[] }) {
  const max = Math.max(...points.map((point) => point.events), 1)

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-ink/40">Audit Activity</p>
          <h3 className="mt-1 text-[1rem] font-bold text-ink">Recent system events</h3>
        </div>
        <span className="rounded-full bg-paper px-3 py-1 text-[0.75rem] font-semibold text-ink/55">{points.length} days</span>
      </div>
      <div className="mt-5 flex h-36 items-end gap-2">
        {points.map((point) => (
          <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end rounded-t-lg bg-paper/60 px-1">
              <div
                className="w-full rounded-t-md bg-accent transition-all"
                style={{ height: `${Math.max((point.events / max) * 100, point.events > 0 ? 8 : 0)}%` }}
                title={`${point.events} events`}
              />
            </div>
            <span className="w-full truncate text-center text-[0.68rem] font-semibold text-ink/35">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeeByClassTable({ rows }: { rows: FeeByClass[] }) {
  return (
    <ReportTable title="Fee collection by class" empty="No fee invoices found for this range." columns={['Class', 'Students', 'Billed', 'Collected', 'Outstanding', 'Rate']}>
      {rows.map((row) => (
        <tr key={row.class_id ?? row.class_name} className="border-b border-line/60 last:border-0 hover:bg-accent/[0.035]">
          <td className="px-5 py-3 font-semibold text-ink">{row.class_name}</td>
          <td className="px-4 py-3 text-ink/60">{row.students}</td>
          <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink/70">{formatINR(row.billed)}</td>
          <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#168a66]">{formatINR(row.collected)}</td>
          <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#dc2626]">{formatINR(row.outstanding)}</td>
          <td className="px-5 py-3"><PercentBar value={row.collection_rate} /></td>
        </tr>
      ))}
    </ReportTable>
  )
}

function AttendanceByClassTable({ rows }: { rows: AttendanceByClass[] }) {
  return (
    <ReportTable title="Attendance by class" empty="No attendance records found for this range." columns={['Class', 'Sessions', 'Records', 'Present', 'Absent', 'Rate']}>
      {rows.map((row) => (
        <tr key={row.class_id ?? row.class_name} className="border-b border-line/60 last:border-0 hover:bg-accent/[0.035]">
          <td className="px-5 py-3 font-semibold text-ink">{row.class_name}</td>
          <td className="px-4 py-3 text-ink/60">{row.sessions}</td>
          <td className="px-4 py-3 text-ink/60">{row.records}</td>
          <td className="px-4 py-3 font-semibold text-[#168a66]">{row.present + row.late + row.half_day + row.excused}</td>
          <td className="px-4 py-3 font-semibold text-[#dc2626]">{row.absent}</td>
          <td className="px-5 py-3"><PercentBar value={row.attendance_rate} /></td>
        </tr>
      ))}
    </ReportTable>
  )
}

function ExamByClassTable({ rows }: { rows: ExamByClass[] }) {
  return (
    <ReportTable title="Exam results by class" empty="No published results found for this range." columns={['Class', 'Results', 'Passed', 'Failed', 'Average', 'Pass Rate']}>
      {rows.map((row) => (
        <tr key={row.class_id ?? row.class_name} className="border-b border-line/60 last:border-0 hover:bg-accent/[0.035]">
          <td className="px-5 py-3 font-semibold text-ink">{row.class_name}</td>
          <td className="px-4 py-3 text-ink/60">{row.results}</td>
          <td className="px-4 py-3 font-semibold text-[#168a66]">{row.passed}</td>
          <td className="px-4 py-3 font-semibold text-[#dc2626]">{row.failed}</td>
          <td className="px-4 py-3 font-semibold text-ink/70">{row.average_percentage}%</td>
          <td className="px-5 py-3"><PercentBar value={row.pass_rate} /></td>
        </tr>
      ))}
    </ReportTable>
  )
}

function ReportTable({
  title,
  empty,
  columns,
  children,
}: {
  title: string
  empty: string
  columns: string[]
  children: ReactNode
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children

  return (
    <div className="space-y-3">
      <h3 className="text-[1rem] font-bold text-ink">{title}</h3>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
              {columns.map((column, index) => (
                <th key={column} className={`${index >= 2 && index <= 4 ? 'text-right ' : ''}px-5 py-3.5 font-bold`}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasRows ? children : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PercentBar({ value }: { value: number }) {
  const tone = value >= 85 ? 'bg-[#168a66]' : value >= 60 ? 'bg-[#d6991f]' : 'bg-[#dc2626]'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full ${tone} transition-all duration-500`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      </div>
      <span className="w-10 text-right text-[0.82rem] font-bold text-ink">{value}%</span>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-[88px] animate-pulse rounded-2xl bg-ink/[0.05]" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-ink/[0.05]" />
      <TableSkeleton rows={5} />
    </div>
  )
}

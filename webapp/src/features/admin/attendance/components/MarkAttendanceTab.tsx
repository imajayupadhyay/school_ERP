import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import { inputClass } from '../../components/FormField'
import StatusBadge from '../../components/StatusBadge'
import { CheckIcon, FilterIcon, UsersGroupIcon } from '../../components/icons'
import type { AcademicSession, AttendanceFilters, SchoolClass } from '../AttendancePage'
import { fetchAttendanceRoster, markAttendance } from '../api'
import type { AttendanceStatus, AttendanceStudentRecord } from '../types'
import { ATTENDANCE_STATUSES, attendedCount, summarizeRecords } from '../utils'

interface MarkAttendanceTabProps {
  academicSessions: AcademicSession[]
  classes: SchoolClass[]
  selectedClass: SchoolClass | null
  filters: AttendanceFilters
  setFilters: Dispatch<SetStateAction<AttendanceFilters>>
  canMark: boolean
  isSetupLoading: boolean
}

export default function MarkAttendanceTab({
  academicSessions,
  classes,
  selectedClass,
  filters,
  setFilters,
  canMark,
  isSetupLoading,
}: MarkAttendanceTabProps) {
  const queryClient = useQueryClient()
  const [records, setRecords] = useState<AttendanceStudentRecord[]>([])
  const [formError, setFormError] = useState('')

  const rosterParams = useMemo(() => {
    if (!filters.academicSessionId || !filters.classId || !filters.attendanceDate) return null

    return {
      academic_session_id: Number(filters.academicSessionId),
      class_id: Number(filters.classId),
      section_id: filters.sectionId ? Number(filters.sectionId) : undefined,
      attendance_date: filters.attendanceDate,
    }
  }, [filters])

  const {
    data: roster,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['attendance-roster', rosterParams],
    queryFn: () => fetchAttendanceRoster(rosterParams!),
    enabled: !!rosterParams,
  })

  useEffect(() => {
    setRecords(roster?.students ?? [])
  }, [roster])

  const summary = useMemo(() => summarizeRecords(records), [records])
  const attendancePercentage = summary.total > 0 ? Math.round((attendedCount(summary) / summary.total) * 100) : 0

  const saveMutation = useMutation({
    mutationFn: (status: 'draft' | 'submitted') => {
      if (!rosterParams) throw new Error('Select a session, class, and date first.')

      return markAttendance({
        ...rosterParams,
        status,
        records: records.map((record) => ({
          student_id: record.student_id,
          status: record.status,
          remarks: record.remarks?.trim() || null,
        })),
      })
    },
    onSuccess: async () => {
      setFormError('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance-roster'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-summary'] }),
      ])
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const updateRecord = (studentId: number, updates: Partial<Pick<AttendanceStudentRecord, 'status' | 'remarks'>>) => {
    setRecords((current) =>
      current.map((record) => (record.student_id === studentId ? { ...record, ...updates } : record)),
    )
  }

  const setAllStatus = (status: AttendanceStatus) => {
    setRecords((current) => current.map((record) => ({ ...record, status })))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
          <FilterIcon width={16} height={16} className="text-accent" />
          Select roster
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_160px_170px]">
          <select
            value={filters.academicSessionId}
            onChange={(event) => setFilters((current) => ({ ...current, academicSessionId: event.target.value }))}
            className={inputClass}
            aria-label="Academic session"
            disabled={isSetupLoading}
          >
            <option value="">Select session</option>
            {academicSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
                {session.is_current ? ' · current' : ''}
              </option>
            ))}
          </select>

          <select
            value={filters.classId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, classId: event.target.value, sectionId: '' }))
            }
            className={inputClass}
            aria-label="Class"
            disabled={isSetupLoading}
          >
            <option value="">Select class</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </select>

          <select
            value={filters.sectionId}
            onChange={(event) => setFilters((current) => ({ ...current, sectionId: event.target.value }))}
            className={inputClass}
            aria-label="Section"
            disabled={!selectedClass}
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
            value={filters.attendanceDate}
            onChange={(event) => setFilters((current) => ({ ...current, attendanceDate: event.target.value }))}
            className={inputClass}
            aria-label="Attendance date"
          />
        </div>
      </div>

      {!rosterParams ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <UsersGroupIcon width={30} height={30} />
          </span>
          <h3 className="mt-4 text-[1.05rem] font-bold text-ink">Load a class roster</h3>
          <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
            Select an academic session, class, and attendance date above to load students.
          </p>
        </div>
      ) : isFetching ? (
        <RosterSkeleton />
      ) : isError ? (
        <div className="grid place-items-center rounded-2xl border border-line bg-white px-5 py-14 shadow-sm">
          <div className="text-center">
            <p className="text-[0.9rem] font-semibold text-ink">Unable to load attendance roster</p>
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
            <SummaryCard label="Roster" value={summary.total} tone="ink" />
            <SummaryCard label="Present" value={summary.present} tone="success" />
            <SummaryCard label="Absent" value={summary.absent} tone="danger" />
            <SummaryCard label="Late" value={summary.late} tone="warn" />
            <SummaryCard label="Excused" value={summary.excused + summary.half_day} tone="ink" />
            <RateCard percentage={attendancePercentage} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-line bg-paper/40 px-4 py-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[0.95rem] font-bold text-ink">
                  {selectedClass?.name ?? 'Selected class'}
                  {filters.sectionId
                    ? ` · Section ${selectedClass?.sections.find((section) => String(section.id) === filters.sectionId)?.name ?? ''}`
                    : ''}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.75rem] text-ink/45">
                  <span>{filters.attendanceDate}</span>
                  {roster?.is_marked ? (
                    <StatusBadge status={roster.session?.status ?? 'submitted'} />
                  ) : (
                    <span className="rounded-full bg-ink/8 px-2 py-0.5 font-semibold text-ink/45">Unmarked</span>
                  )}
                </div>
              </div>

              {canMark && records.length > 0 && (
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() => setAllStatus('present')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-[0.78rem] font-semibold text-ink/65 transition hover:border-[#168a66] hover:bg-[#168a66]/5 hover:text-[#168a66]"
                  >
                    <CheckIcon width={15} height={15} />
                    All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecords((current) => current.map((record) => ({ ...record, remarks: '' })))}
                    className="rounded-xl border border-line bg-white px-3 py-2 text-[0.78rem] font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
                  >
                    Clear Remarks
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[0.85rem]">
                <thead>
                  <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                    <th className="px-5 py-3.5 font-bold">Student</th>
                    <th className="px-4 py-3.5 font-bold">Roll</th>
                    <th className="px-4 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">
                        No active students found for this roster.
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.student_id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-paper-2 to-paper text-[0.74rem] font-bold text-ink/55 ring-1 ring-line">
                              {initials(record.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-ink">{record.full_name}</p>
                              <p className="text-[0.74rem] text-ink/45">{record.admission_no ?? 'No admission no'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink/60">{record.roll_no ?? '—'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={record.status}
                            onChange={(event) =>
                              updateRecord(record.student_id, { status: event.target.value as AttendanceStatus })
                            }
                            className={`${statusSelectClass(record.status)} min-w-[140px] rounded-lg border px-3 py-2 text-[0.82rem] font-semibold outline-none transition focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed`}
                            disabled={!canMark}
                            aria-label={`Attendance status for ${record.full_name}`}
                          >
                            {ATTENDANCE_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            value={record.remarks ?? ''}
                            onChange={(event) => updateRecord(record.student_id, { remarks: event.target.value })}
                            className={`${inputClass} min-w-[220px] py-2 text-[0.82rem]`}
                            placeholder="Optional note"
                            disabled={!canMark}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {formError && <p className="border-t border-line px-5 py-3 text-[0.82rem] font-medium text-[#dc2626]">{formError}</p>}

            <div className="flex flex-col gap-3 border-t border-line bg-paper/40 px-4 py-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={!canMark || records.length === 0 || saveMutation.isPending}
                onClick={() => saveMutation.mutate('draft')}
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:opacity-45"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={!canMark || records.length === 0 || saveMutation.isPending}
                onClick={() => saveMutation.mutate('submitted')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5 disabled:opacity-45 disabled:hover:translate-y-0"
              >
                <CheckIcon width={16} height={16} />
                {saveMutation.isPending ? 'Saving…' : 'Submit Attendance'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

type Tone = 'ink' | 'success' | 'danger' | 'warn'

const TONE_STYLES: Record<Tone, { value: string; bar: string }> = {
  ink: { value: 'text-ink', bar: 'bg-ink/30' },
  success: { value: 'text-[#168a66]', bar: 'bg-[#168a66]' },
  danger: { value: 'text-[#dc2626]', bar: 'bg-[#dc2626]' },
  warn: { value: 'text-[#b45309]', bar: 'bg-[#d6991f]' },
}

function SummaryCard({ label, value, tone = 'ink' }: { label: string; value: number | string; tone?: Tone }) {
  const styles = TONE_STYLES[tone]
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${styles.bar}`} />
        <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      </div>
      <p className={`mt-1.5 text-[1.5rem] font-extrabold leading-none ${styles.value}`}>{value}</p>
    </div>
  )
}

function RateCard({ percentage }: { percentage: number }) {
  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] px-4 py-3 shadow-sm">
      <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-accent/80">Attendance rate</p>
      <p className="mt-1.5 text-[1.5rem] font-extrabold leading-none text-accent">{percentage}%</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent/15">
        <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function RosterSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[72px] animate-pulse rounded-2xl bg-ink/[0.05]" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-ink/[0.05]" />
    </div>
  )
}

/** Colour the status <select> by its current value for quick visual scanning. */
function statusSelectClass(status: AttendanceStatus): string {
  switch (status) {
    case 'present':
      return 'border-[#168a66]/30 bg-[#168a66]/10 text-[#168a66]'
    case 'absent':
      return 'border-[#dc2626]/30 bg-[#dc2626]/10 text-[#dc2626]'
    case 'late':
      return 'border-[#d6991f]/40 bg-lime/15 text-[#b45309]'
    case 'half_day':
      return 'border-[#2c49a6]/30 bg-[#2c49a6]/10 text-[#2c49a6]'
    default:
      return 'border-line bg-white text-ink/65'
  }
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

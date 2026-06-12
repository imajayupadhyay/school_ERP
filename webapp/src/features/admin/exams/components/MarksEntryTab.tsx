import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import type { SchoolClass } from '../../academic-setup/types'
import { inputClass } from '../../components/FormField'
import StatusBadge from '../../components/StatusBadge'
import { CheckIcon, ChevronRightIcon, FilterIcon } from '../../components/icons'
import { TableErrorState, TableSkeleton } from '../../components/TableUI'
import { fetchExamSchedules, fetchExams, fetchMarkRoster, saveMarks } from '../api'
import type { MarkAttendanceStatus, MarkRosterStudent } from '../types'

interface Props {
  classes: SchoolClass[]
  canEnterMarks: boolean
  isSetupLoading: boolean
}

export default function MarksEntryTab({ classes, canEnterMarks, isSetupLoading }: Props) {
  const [examId, setExamId] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null)

  const examsQuery = useQuery({ queryKey: ['exams', 'marks'], queryFn: () => fetchExams() })
  const selectedClass = useMemo(
    () => classes.find((schoolClass) => String(schoolClass.id) === classId) ?? null,
    [classes, classId],
  )
  const scheduleParams = {
    exam_id: examId ? Number(examId) : undefined,
    class_id: classId ? Number(classId) : undefined,
    section_id: sectionId ? Number(sectionId) : undefined,
  }
  const schedulesQuery = useQuery({
    queryKey: ['exam-schedules', 'marks', scheduleParams],
    queryFn: () => fetchExamSchedules(scheduleParams),
    enabled: !!examId,
  })
  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data])
  const activeScheduleId = selectedScheduleId !== null && schedules.some((item) => item.id === selectedScheduleId)
    ? selectedScheduleId
    : null

  const rosterQuery = useQuery({
    queryKey: ['exam-mark-roster', activeScheduleId],
    queryFn: () => fetchMarkRoster(activeScheduleId!),
    enabled: activeScheduleId !== null,
  })

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
          <FilterIcon width={16} height={16} className="text-accent" />
          Select paper
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(190px,1fr)_minmax(160px,1fr)_150px]">
          <select
            value={examId}
            onChange={(event) => {
              setExamId(event.target.value)
              setSelectedScheduleId(null)
            }}
            className={inputClass}
            aria-label="Exam"
            disabled={examsQuery.isLoading}
          >
            <option value="">Select exam</option>
            {(examsQuery.data ?? []).map((exam) => (
              <option key={exam.id} value={exam.id}>{exam.name}</option>
            ))}
          </select>
          <select
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value)
              setSectionId('')
              setSelectedScheduleId(null)
            }}
            className={inputClass}
            aria-label="Class"
            disabled={isSetupLoading}
          >
            <option value="">All assigned classes</option>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
          </select>
          <select
            value={sectionId}
            onChange={(event) => {
              setSectionId(event.target.value)
              setSelectedScheduleId(null)
            }}
            className={inputClass}
            aria-label="Section"
            disabled={!selectedClass}
          >
            <option value="">All sections</option>
            {selectedClass?.sections.map((section) => <option key={section.id} value={section.id}>Section {section.name}</option>)}
          </select>
        </div>
      </div>

      {!examId ? (
        <EmptyState text="Select an exam to load the papers assigned to you." />
      ) : schedulesQuery.isLoading ? (
        <TableSkeleton rows={4} />
      ) : schedulesQuery.isError ? (
        <TableErrorState message={extractErrorMessage(schedulesQuery.error)} onRetry={() => schedulesQuery.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                <th className="px-5 py-3.5 font-bold">Paper</th>
                <th className="px-4 py-3.5 font-bold">Class</th>
                <th className="px-4 py-3.5 font-bold">Date</th>
                <th className="px-4 py-3.5 font-bold">Marks</th>
                <th className="px-5 py-3.5 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">No assigned papers match these filters.</td></tr>
              ) : schedules.map((schedule) => {
                const isActive = activeScheduleId === schedule.id
                return (
                  <tr key={schedule.id} className={`group border-b border-line/60 transition-colors last:border-0 ${isActive ? 'bg-accent/[0.06]' : 'hover:bg-accent/[0.035]'}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-8 w-1 shrink-0 rounded-full transition ${isActive ? 'bg-accent' : 'bg-transparent'}`} />
                      <div>
                        <p className="font-semibold text-ink">{schedule.subject?.name ?? '—'}</p>
                        <p className="text-[0.74rem] text-ink/45">{schedule.start_time || 'Time pending'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/65">{schedule.class?.name}{schedule.section ? ` · ${schedule.section.name}` : ' · All sections'}</td>
                  <td className="px-4 py-3 text-ink/65">{schedule.exam_date}</td>
                  <td className="px-4 py-3 text-ink/65">
                    <span className="font-semibold text-ink/75">{schedule.max_marks}</span> total ·{' '}
                    <span className="font-semibold text-[#168a66]">{schedule.submitted_marks_count}</span> submitted
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedScheduleId(schedule.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-ink/65 transition hover:border-accent hover:bg-accent/5 hover:text-accent"
                      >
                        Open Roster
                        <ChevronRightIcon width={15} height={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {activeScheduleId !== null && (
        rosterQuery.isLoading ? (
          <div className="h-80 animate-pulse rounded-2xl bg-ink/[0.05]" />
        ) : rosterQuery.isError ? (
          <TableErrorState message={extractErrorMessage(rosterQuery.error)} onRetry={() => rosterQuery.refetch()} />
        ) : rosterQuery.data ? (
          <MarksRoster
            key={`${activeScheduleId}-${rosterQuery.dataUpdatedAt}`}
            scheduleId={activeScheduleId}
            roster={rosterQuery.data}
            canEnterMarks={canEnterMarks}
          />
        ) : null
      )}
    </div>
  )
}

function MarksRoster({
  scheduleId,
  roster,
  canEnterMarks,
}: {
  scheduleId: number
  roster: Awaited<ReturnType<typeof fetchMarkRoster>>
  canEnterMarks: boolean
}) {
  const queryClient = useQueryClient()
  const [records, setRecords] = useState<MarkRosterStudent[]>(roster.students)
  const [formError, setFormError] = useState('')
  const maxMarks = roster.schedule.max_marks
  const submittedCount = records.filter((record) => record.status === 'submitted').length

  const saveMutation = useMutation({
    mutationFn: (status: 'draft' | 'submitted') => saveMarks(scheduleId, {
      status,
      records: records.map((record) => ({
        student_id: record.student_id,
        marks_obtained: record.attendance_status === 'present' ? record.marks_obtained : null,
        attendance_status: record.attendance_status,
        remarks: record.remarks?.trim() || null,
      })),
    }),
    onSuccess: async (saved) => {
      setFormError('')
      setRecords(saved.students)
      await queryClient.invalidateQueries({ queryKey: ['exam-schedules'] })
    },
    onError: (error) => setFormError(extractErrorMessage(error)),
  })

  const updateRecord = (studentId: number, updates: Partial<MarkRosterStudent>) => {
    setRecords((current) => current.map((record) => record.student_id === studentId ? { ...record, ...updates } : record))
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-line bg-paper/40 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-bold text-ink">{roster.schedule.subject?.name} · {roster.schedule.class?.name}{roster.schedule.section ? ` ${roster.schedule.section.name}` : ''}</p>
          <p className="mt-0.5 text-[0.78rem] text-ink/45">{records.length} students · {submittedCount} submitted · Maximum {maxMarks}</p>
        </div>
        {roster.is_locked && <div className="sm:ml-auto"><StatusBadge status="published" /></div>}
      </div>

      {roster.is_locked && (
        <p className="border-b border-line bg-[#168a66]/5 px-5 py-3 text-[0.82rem] text-[#168a66]">
          Published results lock this roster. Unpublish the class results before changing marks.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
              <th className="px-5 py-3.5 font-bold">Student</th>
              <th className="px-4 py-3.5 font-bold">Attendance</th>
              <th className="px-4 py-3.5 font-bold">Marks</th>
              <th className="px-5 py-3.5 font-bold">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">No active students found for this roster.</td></tr>
            ) : records.map((record) => (
              <tr key={record.student_id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                <td className="px-5 py-3">
                  <p className="font-semibold text-ink">{record.full_name}</p>
                  <p className="text-[0.74rem] text-ink/45">{record.admission_no ?? 'No admission no'} · Roll {record.roll_no ?? '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={record.attendance_status}
                    onChange={(event) => {
                      const attendance = event.target.value as MarkAttendanceStatus
                      updateRecord(record.student_id, {
                        attendance_status: attendance,
                        marks_obtained: attendance === 'present' ? record.marks_obtained : null,
                      })
                    }}
                    className={`${inputClass} min-w-[125px] py-2 text-[0.82rem]`}
                    disabled={!canEnterMarks || roster.is_locked}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="exempt">Exempt</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    max={maxMarks}
                    step="0.01"
                    value={record.marks_obtained ?? ''}
                    onChange={(event) => updateRecord(record.student_id, { marks_obtained: event.target.value === '' ? null : Number(event.target.value) })}
                    className={`${inputClass} min-w-[110px] py-2 text-[0.82rem]`}
                    placeholder={`0-${maxMarks}`}
                    disabled={!canEnterMarks || roster.is_locked || record.attendance_status !== 'present'}
                    aria-label={`Marks for ${record.full_name}`}
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    value={record.remarks ?? ''}
                    onChange={(event) => updateRecord(record.student_id, { remarks: event.target.value })}
                    className={`${inputClass} min-w-[210px] py-2 text-[0.82rem]`}
                    placeholder="Optional note"
                    disabled={!canEnterMarks || roster.is_locked}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formError && <p className="border-t border-line px-5 py-3 text-[0.82rem] font-medium text-[#dc2626]">{formError}</p>}
      <div className="flex flex-col gap-2 border-t border-line bg-paper/40 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => saveMutation.mutate('draft')}
          disabled={!canEnterMarks || roster.is_locked || records.length === 0 || saveMutation.isPending}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:opacity-45"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => saveMutation.mutate('submitted')}
          disabled={!canEnterMarks || roster.is_locked || records.length === 0 || saveMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5 disabled:opacity-45 disabled:hover:translate-y-0"
        >
          <CheckIcon width={16} height={16} />
          {saveMutation.isPending ? 'Saving…' : 'Submit Marks'}
        </button>
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-12 text-center text-[0.9rem] text-ink/45 shadow-sm">{text}</div>
}

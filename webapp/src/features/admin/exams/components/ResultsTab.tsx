import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import type { SchoolClass } from '../../academic-setup/types'
import { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { CheckIcon, EyeIcon, FilterIcon, GraduationIcon } from '../../components/icons'
import { RowAction, TableErrorState, TableSkeleton } from '../../components/TableUI'
import { fetchExamResults, fetchExams, fetchStudentResult, publishResults, unpublishResults } from '../api'
import type { ExamResult } from '../types'

interface Props {
  classes: SchoolClass[]
  canManage: boolean
  isSetupLoading: boolean
}

export default function ResultsTab({ classes, canManage, isSetupLoading }: Props) {
  const queryClient = useQueryClient()
  const [examId, setExamId] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null)
  const [actionError, setActionError] = useState('')

  const examsQuery = useQuery({ queryKey: ['exams', 'results'], queryFn: () => fetchExams() })
  const selectedClass = useMemo(
    () => classes.find((schoolClass) => String(schoolClass.id) === classId) ?? null,
    [classes, classId],
  )
  const resultsQuery = useQuery({
    queryKey: ['exam-results', examId, classId, sectionId],
    queryFn: () => fetchExamResults(Number(examId), {
      class_id: classId ? Number(classId) : undefined,
      section_id: sectionId ? Number(sectionId) : undefined,
    }),
    enabled: canManage && !!examId,
  })
  const results = resultsQuery.data ?? []
  const scopeReady = !!examId && !!classId
  const scopePayload = {
    class_id: Number(classId),
    section_id: sectionId ? Number(sectionId) : null,
  }

  const publishMutation = useMutation({
    mutationFn: () => publishResults(Number(examId), scopePayload),
    onSuccess: async () => {
      setActionError('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['exam-results'] }),
        queryClient.invalidateQueries({ queryKey: ['exams'] }),
        queryClient.invalidateQueries({ queryKey: ['exam-mark-roster'] }),
      ])
    },
    onError: (error) => setActionError(extractErrorMessage(error)),
  })
  const unpublishMutation = useMutation({
    mutationFn: () => unpublishResults(Number(examId), scopePayload),
    onSuccess: async () => {
      setActionError('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['exam-results'] }),
        queryClient.invalidateQueries({ queryKey: ['exams'] }),
        queryClient.invalidateQueries({ queryKey: ['exam-mark-roster'] }),
      ])
    },
    onError: (error) => setActionError(extractErrorMessage(error)),
  })

  if (!canManage) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink/5 text-ink/40">
          <GraduationIcon width={28} height={28} />
        </span>
        <p className="mt-4 text-[1.05rem] font-bold text-ink">Result administration is restricted</p>
        <p className="mt-1 max-w-sm text-[0.84rem] text-ink/50">School admins and principals publish and manage report cards.</p>
      </div>
    )
  }

  const passCount = results.filter((result) => result.result_status === 'pass').length
  const average = results.length > 0
    ? results.reduce((sum, result) => sum + result.percentage, 0) / results.length
    : 0

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
          <FilterIcon width={16} height={16} className="text-accent" />
          Result scope
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(190px,1fr)_minmax(160px,1fr)_150px_auto]">
          <select
            value={examId}
            onChange={(event) => {
              setExamId(event.target.value)
              setActionError('')
            }}
            className={inputClass}
            aria-label="Exam"
            disabled={examsQuery.isLoading}
          >
            <option value="">Select exam</option>
            {(examsQuery.data ?? []).map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
          </select>
          <select
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value)
              setSectionId('')
              setActionError('')
            }}
            className={inputClass}
            aria-label="Class"
            disabled={isSetupLoading}
          >
            <option value="">Select class scope</option>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
          </select>
          <select
            value={sectionId}
            onChange={(event) => {
              setSectionId(event.target.value)
              setActionError('')
            }}
            className={inputClass}
            aria-label="Section"
            disabled={!selectedClass}
          >
            <option value="">All sections</option>
            {selectedClass?.sections.map((section) => <option key={section.id} value={section.id}>Section {section.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!scopeReady || publishMutation.isPending || unpublishMutation.isPending}
              onClick={() => {
                if (window.confirm('Publish report cards for the selected class scope? Marks will be locked.')) publishMutation.mutate()
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5 disabled:opacity-45 disabled:hover:translate-y-0"
            >
              <CheckIcon width={16} height={16} />
              Publish
            </button>
            <button
              type="button"
              disabled={!scopeReady || publishMutation.isPending || unpublishMutation.isPending}
              onClick={() => {
                if (window.confirm('Unpublish these report cards? Existing result snapshots will be removed.')) unpublishMutation.mutate()
              }}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:opacity-45"
            >
              Unpublish
            </button>
          </div>
        </div>
        {actionError && <p className="mt-3 text-[0.82rem] font-medium text-[#dc2626]">{actionError}</p>}
      </div>

      {!examId ? (
        <EmptyState text="Select an exam to review published report cards." />
      ) : resultsQuery.isLoading ? (
        <TableSkeleton rows={5} />
      ) : resultsQuery.isError ? (
        <TableErrorState message={extractErrorMessage(resultsQuery.error)} onRetry={() => resultsQuery.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Published" value={results.length} tone="ink" />
            <SummaryCard label="Passed" value={passCount} tone="success" />
            <SummaryCard label="Class Average" value={`${average.toFixed(1)}%`} tone="accent" />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">Student</th>
                  <th className="px-4 py-3.5 font-bold">Class</th>
                  <th className="px-4 py-3.5 font-bold">Score</th>
                  <th className="px-4 py-3.5 font-bold">Grade</th>
                  <th className="px-4 py-3.5 font-bold">Result</th>
                  <th className="px-5 py-3.5 text-right font-bold">Report Card</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">No published results match this scope.</td></tr>
                ) : results.map((result) => (
                  <tr key={result.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-ink">{result.student?.full_name ?? '—'}</p>
                      <p className="text-[0.74rem] text-ink/45">{result.student?.admission_no ?? 'No admission no'} · Roll {result.student?.roll_no ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-ink/65">{result.class?.name ?? '—'}{result.section ? ` · ${result.section.name}` : ''}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{result.obtained_marks} <span className="font-normal text-ink/40">/ {result.total_marks}</span></p>
                      <p className="text-[0.74rem] text-ink/45">{result.percentage.toFixed(2)}%</p>
                    </td>
                    <td className="px-4 py-3">
                      {result.grade ? (
                        <span className="inline-grid h-7 min-w-7 place-items-center rounded-lg bg-ink/[0.06] px-2 text-[0.8rem] font-bold text-ink/70">{result.grade}</span>
                      ) : (
                        <span className="text-ink/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={result.result_status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end opacity-80 transition-opacity group-hover:opacity-100">
                        <RowAction label="View report card" onClick={() => setSelectedResult(result)}>
                          <EyeIcon width={17} height={17} />
                        </RowAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedResult && (
        <ReportCardModal summary={selectedResult} onClose={() => setSelectedResult(null)} />
      )}
    </div>
  )
}

function ReportCardModal({ summary, onClose }: { summary: ExamResult; onClose: () => void }) {
  const detailQuery = useQuery({
    queryKey: ['exam-result', summary.exam_id, summary.student_id],
    queryFn: () => fetchStudentResult(summary.exam_id, summary.student_id),
  })
  const result = detailQuery.data

  return (
    <Modal title="Report Card" description={`${summary.student?.full_name ?? 'Student'} · ${summary.class?.name ?? ''}`} onClose={onClose} size="lg">
      {detailQuery.isLoading ? (
        <div className="h-72 animate-pulse rounded-xl bg-ink/[0.05]" />
      ) : detailQuery.isError ? (
        <TableErrorState message={extractErrorMessage(detailQuery.error)} onRetry={() => detailQuery.refetch()} />
      ) : result ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryCard label="Obtained" value={`${result.obtained_marks}/${result.total_marks}`} />
            <SummaryCard label="Percentage" value={`${result.percentage.toFixed(2)}%`} />
            <SummaryCard label="Grade" value={result.grade ?? '—'} />
            <SummaryCard label="Result" value={result.result_status.toUpperCase()} tone={result.result_status === 'pass' ? 'success' : 'danger'} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-[0.84rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-4 py-3 font-bold">Subject</th>
                  <th className="px-4 py-3 font-bold">Marks</th>
                  <th className="px-4 py-3 font-bold">Pass Mark</th>
                  <th className="px-4 py-3 font-bold">Grade</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(result.items ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-line/60 last:border-0 hover:bg-accent/[0.03]">
                    <td className="px-4 py-3 font-semibold text-ink">{item.subject_name}</td>
                    <td className="px-4 py-3 text-ink/65">
                      {item.attendance_status === 'present' ? `${item.marks_obtained ?? '—'} / ${item.max_marks}` : item.attendance_status}
                    </td>
                    <td className="px-4 py-3 text-ink/65">{item.passing_marks}</td>
                    <td className="px-4 py-3 text-ink/65">{item.grade ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.result_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.76rem] text-ink/45">
            Published {result.published_at ? new Date(result.published_at).toLocaleString() : '—'}
            {result.publisher?.name ? ` by ${result.publisher.name}` : ''}
          </p>
        </div>
      ) : null}
    </Modal>
  )
}

function SummaryCard({ label, value, tone = 'ink' }: { label: string; value: string | number; tone?: 'ink' | 'success' | 'danger' | 'accent' }) {
  const map = {
    ink: { value: 'text-ink', dot: 'bg-ink/30', card: 'border-line bg-white' },
    success: { value: 'text-[#168a66]', dot: 'bg-[#168a66]', card: 'border-line bg-white' },
    danger: { value: 'text-[#dc2626]', dot: 'bg-[#dc2626]', card: 'border-line bg-white' },
    accent: { value: 'text-accent', dot: 'bg-accent', card: 'border-accent/25 bg-accent/[0.06]' },
  }[tone]
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${map.card}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${map.dot}`} />
        <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      </div>
      <p className={`mt-1.5 text-[1.4rem] font-extrabold leading-none ${map.value}`}>{value}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-12 text-center text-[0.9rem] text-ink/45 shadow-sm">{text}</div>
}

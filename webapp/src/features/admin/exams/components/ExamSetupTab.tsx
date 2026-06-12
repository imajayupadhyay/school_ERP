import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import type { AcademicSession, SchoolClass, Subject } from '../../academic-setup/types'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import {
  archiveExam,
  createExam,
  createExamSchedule,
  deleteExamSchedule,
  fetchExamSchedules,
  fetchExams,
  updateExam,
  updateExamSchedule,
} from '../api'
import type { Exam, ExamPayload, ExamSchedule, ExamSchedulePayload, ExamStatus, ExamType, ScheduleStatus } from '../types'
import { EXAM_TYPE_LABELS } from '../types'

interface Props {
  academicSessions: AcademicSession[]
  classes: SchoolClass[]
  subjects: Subject[]
  canManage: boolean
  isSetupLoading: boolean
}

interface ExamFormState {
  academic_session_id: string
  name: string
  exam_type: ExamType
  start_date: string
  end_date: string
  description: string
  status: ExamStatus
}

interface ScheduleFormState {
  class_id: string
  section_id: string
  subject_id: string
  exam_date: string
  start_time: string
  end_time: string
  max_marks: string
  passing_marks: string
  room: string
  status: ScheduleStatus
}

export default function ExamSetupTab({ academicSessions, classes, subjects, canManage, isSetupLoading }: Props) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
  const [examModal, setExamModal] = useState<Exam | 'new' | null>(null)
  const [scheduleModal, setScheduleModal] = useState<ExamSchedule | 'new' | null>(null)

  const examParams = {
    search: search.trim() || undefined,
    academic_session_id: sessionId ? Number(sessionId) : undefined,
  }
  const examsQuery = useQuery({
    queryKey: ['exams', examParams],
    queryFn: () => fetchExams(examParams),
  })
  const exams = useMemo(() => examsQuery.data ?? [], [examsQuery.data])
  const activeExamId = selectedExamId !== null && exams.some((exam) => exam.id === selectedExamId)
    ? selectedExamId
    : exams[0]?.id ?? null
  const selectedExam = exams.find((exam) => exam.id === activeExamId) ?? null

  const schedulesQuery = useQuery({
    queryKey: ['exam-schedules', activeExamId],
    queryFn: () => fetchExamSchedules({ exam_id: activeExamId! }),
    enabled: activeExamId !== null,
  })

  const archiveMutation = useMutation({
    mutationFn: archiveExam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exams'] }),
    onError: (error) => window.alert(extractErrorMessage(error)),
  })
  const deleteScheduleMutation = useMutation({
    mutationFn: deleteExamSchedule,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['exam-schedules'] }),
        queryClient.invalidateQueries({ queryKey: ['exams'] }),
      ])
    },
    onError: (error) => window.alert(extractErrorMessage(error)),
  })

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(180px,260px)_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass}
            placeholder="Search exams"
            aria-label="Search exams"
          />
          <select
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            className={inputClass}
            disabled={isSetupLoading}
            aria-label="Academic session"
          >
            <option value="">All sessions</option>
            {academicSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}{session.is_current ? ' · current' : ''}
              </option>
            ))}
          </select>
          {canManage && (
            <button
              type="button"
              onClick={() => setExamModal('new')}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
            >
              Add Exam
            </button>
          )}
        </div>
      </div>

      {examsQuery.isLoading ? (
        <div className="h-72 animate-pulse rounded-2xl bg-ink/5" />
      ) : examsQuery.isError ? (
        <ErrorState message={extractErrorMessage(examsQuery.error)} onRetry={() => examsQuery.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
                <th className="px-5 py-3 font-semibold">Exam</th>
                <th className="px-4 py-3 font-semibold">Session</th>
                <th className="px-4 py-3 font-semibold">Dates</th>
                <th className="px-4 py-3 font-semibold">Papers</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-ink/40">No exams match the current filters.</td></tr>
              ) : exams.map((exam) => (
                <tr
                  key={exam.id}
                  onClick={() => setSelectedExamId(exam.id)}
                  className={`cursor-pointer border-b border-line/60 last:border-0 hover:bg-paper/50 ${
                    activeExamId === exam.id ? 'bg-accent/[0.045]' : ''
                  }`}
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink">{exam.name}</p>
                    <p className="text-[0.74rem] text-ink/45">{EXAM_TYPE_LABELS[exam.exam_type]}</p>
                  </td>
                  <td className="px-4 py-3 text-ink/65">{exam.academic_session?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-ink/65">{exam.start_date} to {exam.end_date}</td>
                  <td className="px-4 py-3 text-ink/65">{exam.schedules_count}</td>
                  <td className="px-4 py-3"><StatusBadge status={exam.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {canManage && (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); setExamModal(exam) }}
                          className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent"
                        >
                          Edit
                        </button>
                        {exam.status !== 'archived' && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              if (window.confirm(`Archive exam "${exam.name}"?`)) archiveMutation.mutate(exam.id)
                            }}
                            className="text-[0.78rem] font-semibold text-[#dc2626] hover:underline"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[1rem] font-bold text-ink">Paper Schedule</h2>
          <p className="mt-0.5 text-[0.82rem] text-ink/50">
            {selectedExam ? `${selectedExam.name} · ${selectedExam.start_date} to ${selectedExam.end_date}` : 'Select an exam to view its papers.'}
          </p>
        </div>
        {canManage && selectedExam && selectedExam.status !== 'archived' && (
          <button
            type="button"
            onClick={() => setScheduleModal('new')}
            className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85"
          >
            Add Paper
          </button>
        )}
      </div>

      {!selectedExam ? (
        <div className="rounded-2xl border border-line bg-white px-5 py-12 text-center text-[0.9rem] text-ink/45">
          Select an exam above to manage its schedule.
        </div>
      ) : schedulesQuery.isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-ink/5" />
      ) : schedulesQuery.isError ? (
        <ErrorState message={extractErrorMessage(schedulesQuery.error)} onRetry={() => schedulesQuery.refetch()} />
      ) : (
        <ScheduleTable
          schedules={schedulesQuery.data ?? []}
          canManage={canManage}
          onEdit={setScheduleModal}
          onDelete={(schedule) => {
            if (window.confirm(`Delete the ${schedule.subject?.name ?? 'selected'} paper?`)) {
              deleteScheduleMutation.mutate(schedule.id)
            }
          }}
        />
      )}

      {examModal && (
        <ExamFormModal
          value={examModal}
          academicSessions={academicSessions}
          onClose={() => setExamModal(null)}
          onSaved={async (exam) => {
            setSelectedExamId(exam.id)
            setExamModal(null)
            await queryClient.invalidateQueries({ queryKey: ['exams'] })
          }}
        />
      )}
      {scheduleModal && selectedExam && (
        <ScheduleFormModal
          value={scheduleModal}
          exam={selectedExam}
          classes={classes}
          subjects={subjects}
          onClose={() => setScheduleModal(null)}
          onSaved={async () => {
            setScheduleModal(null)
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['exam-schedules'] }),
              queryClient.invalidateQueries({ queryKey: ['exams'] }),
            ])
          }}
        />
      )}
    </div>
  )
}

function ScheduleTable({
  schedules,
  canManage,
  onEdit,
  onDelete,
}: {
  schedules: ExamSchedule[]
  canManage: boolean
  onEdit: (schedule: ExamSchedule) => void
  onDelete: (schedule: ExamSchedule) => void
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full text-left text-[0.85rem]">
        <thead>
          <tr className="border-b border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
            <th className="px-5 py-3 font-semibold">Subject</th>
            <th className="px-4 py-3 font-semibold">Class</th>
            <th className="px-4 py-3 font-semibold">Date & Time</th>
            <th className="px-4 py-3 font-semibold">Marks</th>
            <th className="px-4 py-3 font-semibold">Progress</th>
            <th className="px-5 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {schedules.length === 0 ? (
            <tr><td colSpan={6} className="px-6 py-10 text-center text-ink/40">No papers have been scheduled for this exam.</td></tr>
          ) : schedules.map((schedule) => (
            <tr key={schedule.id} className="border-b border-line/60 last:border-0 hover:bg-paper/50">
              <td className="px-5 py-3">
                <p className="font-medium text-ink">{schedule.subject?.name ?? '—'}</p>
                <p className="text-[0.74rem] text-ink/45">{schedule.room || 'Room not assigned'}</p>
              </td>
              <td className="px-4 py-3 text-ink/65">
                {schedule.class?.name ?? '—'}{schedule.section ? ` · ${schedule.section.name}` : ' · All sections'}
              </td>
              <td className="px-4 py-3 text-ink/65">
                {schedule.exam_date}
                <p className="text-[0.74rem] text-ink/45">
                  {schedule.start_time || 'Time pending'}{schedule.end_time ? ` - ${schedule.end_time}` : ''}
                </p>
              </td>
              <td className="px-4 py-3 text-ink/65">{schedule.max_marks} / pass {schedule.passing_marks}</td>
              <td className="px-4 py-3">
                <StatusBadge status={schedule.status} />
                <p className="mt-1 text-[0.72rem] text-ink/45">{schedule.submitted_marks_count} submitted</p>
              </td>
              <td className="px-5 py-3 text-right">
                {canManage && (
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => onEdit(schedule)} className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(schedule)} className="text-[0.78rem] font-semibold text-[#dc2626] hover:underline">
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExamFormModal({
  value,
  academicSessions,
  onClose,
  onSaved,
}: {
  value: Exam | 'new'
  academicSessions: AcademicSession[]
  onClose: () => void
  onSaved: (exam: Exam) => void
}) {
  const currentSession = academicSessions.find((session) => session.is_current) ?? academicSessions[0]
  const [form, setForm] = useState<ExamFormState>(() => value === 'new' ? {
    academic_session_id: currentSession ? String(currentSession.id) : '',
    name: '',
    exam_type: 'term',
    start_date: '',
    end_date: '',
    description: '',
    status: 'draft',
  } : {
    academic_session_id: String(value.academic_session_id),
    name: value.name,
    exam_type: value.exam_type,
    start_date: value.start_date,
    end_date: value.end_date,
    description: value.description ?? '',
    status: value.status,
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () => {
      const payload: ExamPayload = {
        academic_session_id: Number(form.academic_session_id),
        name: form.name.trim(),
        exam_type: form.exam_type,
        start_date: form.start_date,
        end_date: form.end_date,
        description: form.description.trim() || null,
        status: form.status,
      }
      return value === 'new' ? createExam(payload) : updateExam(value.id, payload)
    },
    onSuccess: onSaved,
    onError: (err) => setError(extractErrorMessage(err)),
  })

  return (
    <Modal title={value === 'new' ? 'Add Exam' : 'Edit Exam'} description="Define the exam window before scheduling subject papers." onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); mutation.mutate() }} className="space-y-4">
        <FormField label="Academic session" htmlFor="exam-session">
          <select id="exam-session" required value={form.academic_session_id} onChange={(event) => setForm({ ...form, academic_session_id: event.target.value })} className={inputClass}>
            <option value="">Select session</option>
            {academicSessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
          </select>
        </FormField>
        <FormField label="Exam name" htmlFor="exam-name">
          <input id="exam-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} placeholder="Term I Examination" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Exam type" htmlFor="exam-type">
            <select id="exam-type" value={form.exam_type} onChange={(event) => setForm({ ...form, exam_type: event.target.value as ExamType })} className={inputClass}>
              {Object.entries(EXAM_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </FormField>
          <FormField label="Status" htmlFor="exam-status">
            <select id="exam-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ExamStatus })} className={inputClass}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start date" htmlFor="exam-start"><input id="exam-start" type="date" required value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className={inputClass} /></FormField>
          <FormField label="End date" htmlFor="exam-end"><input id="exam-end" type="date" required min={form.start_date} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className={inputClass} /></FormField>
        </div>
        <FormField label="Description" htmlFor="exam-description">
          <textarea id="exam-description" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClass} placeholder="Optional internal note" />
        </FormField>
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink/65">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-45">
            {mutation.isPending ? 'Saving...' : 'Save Exam'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ScheduleFormModal({
  value,
  exam,
  classes,
  subjects,
  onClose,
  onSaved,
}: {
  value: ExamSchedule | 'new'
  exam: Exam
  classes: SchoolClass[]
  subjects: Subject[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ScheduleFormState>(() => value === 'new' ? {
    class_id: '',
    section_id: '',
    subject_id: '',
    exam_date: exam.start_date,
    start_time: '',
    end_time: '',
    max_marks: '100',
    passing_marks: '40',
    room: '',
    status: 'scheduled',
  } : {
    class_id: String(value.class_id),
    section_id: value.section_id ? String(value.section_id) : '',
    subject_id: String(value.subject_id),
    exam_date: value.exam_date,
    start_time: value.start_time ?? '',
    end_time: value.end_time ?? '',
    max_marks: String(value.max_marks),
    passing_marks: String(value.passing_marks),
    room: value.room ?? '',
    status: value.status,
  })
  const [error, setError] = useState('')
  const selectedClass = useMemo(() => classes.find((item) => String(item.id) === form.class_id) ?? null, [classes, form.class_id])
  const filteredSubjects = useMemo(() => {
    if (!form.class_id) return []
    return subjects.filter((subject) => subject.classes.some((item) => String(item.id) === form.class_id))
  }, [form.class_id, subjects])
  const mutation = useMutation({
    mutationFn: () => {
      const payload: ExamSchedulePayload = {
        exam_id: exam.id,
        class_id: Number(form.class_id),
        section_id: form.section_id ? Number(form.section_id) : null,
        subject_id: Number(form.subject_id),
        exam_date: form.exam_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        max_marks: Number(form.max_marks),
        passing_marks: Number(form.passing_marks),
        room: form.room.trim() || null,
        status: form.status,
      }
      return value === 'new' ? createExamSchedule(payload) : updateExamSchedule(value.id, payload)
    },
    onSuccess: onSaved,
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal title={value === 'new' ? 'Add Paper' : 'Edit Paper'} description={exam.name} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Class" htmlFor="paper-class">
            <select id="paper-class" required value={form.class_id} onChange={(event) => setForm({ ...form, class_id: event.target.value, section_id: '', subject_id: '' })} className={inputClass}>
              <option value="">Select class</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </FormField>
          <FormField label="Section" htmlFor="paper-section" hint="Leave blank for all sections">
            <select id="paper-section" value={form.section_id} onChange={(event) => setForm({ ...form, section_id: event.target.value })} className={inputClass} disabled={!selectedClass}>
              <option value="">All sections</option>
              {selectedClass?.sections.map((item) => <option key={item.id} value={item.id}>Section {item.name}</option>)}
            </select>
          </FormField>
          <FormField label="Subject" htmlFor="paper-subject">
            <select id="paper-subject" required value={form.subject_id} onChange={(event) => setForm({ ...form, subject_id: event.target.value })} className={inputClass} disabled={!form.class_id}>
              <option value="">Select subject</option>
              {filteredSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Exam date" htmlFor="paper-date">
            <input id="paper-date" type="date" required min={exam.start_date} max={exam.end_date} value={form.exam_date} onChange={(event) => setForm({ ...form, exam_date: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Start time" htmlFor="paper-start">
            <input id="paper-start" type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="End time" htmlFor="paper-end">
            <input id="paper-end" type="time" min={form.start_time} value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Room" htmlFor="paper-room">
            <input id="paper-room" value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} className={inputClass} placeholder="Room 12" />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Maximum marks" htmlFor="paper-max">
            <input id="paper-max" type="number" min="1" step="0.01" required value={form.max_marks} onChange={(event) => setForm({ ...form, max_marks: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Passing marks" htmlFor="paper-pass">
            <input id="paper-pass" type="number" min="0" max={form.max_marks} step="0.01" required value={form.passing_marks} onChange={(event) => setForm({ ...form, passing_marks: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Status" htmlFor="paper-status">
            <select id="paper-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ScheduleStatus })} className={inputClass}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>
        </div>
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink/65">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-45">
            {mutation.isPending ? 'Saving...' : 'Save Paper'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-white px-5 py-14 text-center">
      <div>
        <p className="text-[0.9rem] font-semibold text-ink">Unable to load exam data</p>
        <p className="mt-1 text-[0.82rem] text-ink/50">{message}</p>
        <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white">Try again</button>
      </div>
    </div>
  )
}

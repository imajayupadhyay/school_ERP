import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { extractErrorMessage } from '@/lib/errors'
import type { AcademicSession, SchoolClass, Subject } from '../../academic-setup/types'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import {
  archiveHomework,
  createHomework,
  fetchHomework,
  updateHomework,
  uploadHomeworkAttachment,
} from '../api'
import type { HomeworkAssignment, HomeworkPayload } from '../types'
import { todayInputValue } from '../utils'

const PER_PAGE = 15

interface HomeworkTabProps {
  academicSessions: AcademicSession[]
  classes: SchoolClass[]
  subjects: Subject[]
  canEdit: boolean
  isSetupLoading: boolean
}

interface HomeworkFormValues {
  academic_session_id: string
  class_id: string
  section_id: string
  subject_id: string
  title: string
  instructions: string
  assigned_date: string
  due_date: string
  submission_required: boolean
  status: 'draft' | 'published' | 'archived'
}

export default function HomeworkTab({ academicSessions, classes, subjects, canEdit, isSetupLoading }: HomeworkTabProps) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [status, setStatus] = useState('')
  const [modal, setModal] = useState<HomeworkAssignment | 'new' | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const selectedClass = useMemo(
    () => classes.find((schoolClass) => String(schoolClass.id) === classId) ?? null,
    [classes, classId],
  )

  const params = {
    page,
    per_page: PER_PAGE,
    search: search.trim() || undefined,
    class_id: classId ? Number(classId) : undefined,
    section_id: sectionId ? Number(sectionId) : undefined,
    subject_id: subjectId ? Number(subjectId) : undefined,
    status: status || undefined,
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['homework', params],
    queryFn: () => fetchHomework(params),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['homework'] })

  const saveMutation = useMutation({
    mutationFn: async (vars: { id?: number; payload: HomeworkPayload; attachment?: File | null }) => {
      const saved = vars.id ? await updateHomework(vars.id, vars.payload) : await createHomework(vars.payload)
      return vars.attachment ? uploadHomeworkAttachment(saved.id, vars.attachment) : saved
    },
    onSuccess: () => {
      invalidate()
      setModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const archiveMutation = useMutation({
    mutationFn: archiveHomework,
    onSuccess: invalidate,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const rows = data?.items ?? []
  const meta = data?.meta

  const resetFilters = () => {
    setSearch('')
    setClassId('')
    setSectionId('')
    setSubjectId('')
    setStatus('')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(150px,1fr)_140px_150px_140px_auto]">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className={inputClass}
            placeholder="Search homework"
          />
          <select
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value)
              setSectionId('')
              setSubjectId('')
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
          <select
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value)
              setPage(1)
            }}
            className={inputClass}
            aria-label="Subject"
          >
            <option value="">All subjects</option>
            {subjectsForClass(subjects, classId).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
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
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
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

      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.9rem] text-ink/55">Publish assignments for a class, section, and subject.</p>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setModal('new')
              setModalError(null)
            }}
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
          >
            Add Homework
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-80 animate-pulse rounded-2xl bg-ink/5" />
      ) : isError ? (
        <div className="grid place-items-center rounded-2xl border border-line bg-white px-5 py-14">
          <div className="text-center">
            <p className="text-[0.9rem] font-semibold text-ink">Unable to load homework</p>
            <p className="mt-1 text-[0.82rem] text-ink/50">{extractErrorMessage(error)}</p>
            <button onClick={() => refetch()} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white">
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
                  <th className="px-5 py-3 font-semibold">Homework</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-ink/40">
                      No homework matches the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((homework) => (
                    <tr key={homework.id} className="border-b border-line/60 last:border-0 hover:bg-paper/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">{homework.title}</p>
                        <p className="text-[0.74rem] text-ink/45">
                          Assigned {homework.assigned_date}
                          {homework.attachment_url ? ' · Attachment' : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink/65">
                        {homework.class?.name ?? '—'}
                        {homework.section ? ` · ${homework.section.name}` : ''}
                      </td>
                      <td className="px-4 py-3 text-ink/65">{homework.subject?.name ?? 'General'}</td>
                      <td className={`px-4 py-3 ${homework.is_overdue ? 'font-semibold text-[#dc2626]' : 'text-ink/65'}`}>
                        {homework.due_date ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={homework.is_overdue ? 'overdue' : homework.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          {homework.attachment_url && (
                            <a
                              href={homework.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent"
                            >
                              File
                            </a>
                          )}
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setModal(homework)
                                  setModalError(null)
                                }}
                                className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent"
                              >
                                Edit
                              </button>
                              {homework.status !== 'archived' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Archive homework "${homework.title}"?`)) archiveMutation.mutate(homework.id)
                                  }}
                                  className="text-[0.78rem] font-semibold text-[#dc2626] hover:underline"
                                >
                                  Archive
                                </button>
                              )}
                            </>
                          )}
                        </div>
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

      {modal && (
        <HomeworkModal
          homework={modal === 'new' ? null : modal}
          academicSessions={academicSessions}
          classes={classes}
          subjects={subjects}
          onClose={() => {
            setModal(null)
            setModalError(null)
          }}
          onSubmit={(payload, attachment) =>
            saveMutation.mutate({ id: modal === 'new' ? undefined : modal.id, payload, attachment })
          }
          isSaving={saveMutation.isPending}
          error={modalError}
        />
      )}
    </div>
  )
}

function HomeworkModal({
  homework,
  academicSessions,
  classes,
  subjects,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  homework: HomeworkAssignment | null
  academicSessions: AcademicSession[]
  classes: SchoolClass[]
  subjects: Subject[]
  onClose: () => void
  onSubmit: (payload: HomeworkPayload, attachment: File | null) => void
  isSaving: boolean
  error: string | null
}) {
  const currentSession = academicSessions.find((session) => session.is_current) ?? academicSessions[0]
  const [attachment, setAttachment] = useState<File | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<HomeworkFormValues>({
    defaultValues: homework
      ? {
          academic_session_id: homework.academic_session_id ? String(homework.academic_session_id) : '',
          class_id: String(homework.class_id),
          section_id: homework.section_id ? String(homework.section_id) : '',
          subject_id: homework.subject_id ? String(homework.subject_id) : '',
          title: homework.title,
          instructions: homework.instructions ?? '',
          assigned_date: homework.assigned_date,
          due_date: homework.due_date ?? '',
          submission_required: homework.submission_required,
          status: homework.status,
        }
      : {
          academic_session_id: currentSession ? String(currentSession.id) : '',
          class_id: '',
          section_id: '',
          subject_id: '',
          title: '',
          instructions: '',
          assigned_date: todayInputValue(),
          due_date: '',
          submission_required: true,
          status: 'published',
        },
  })

  const selectedClassId = watch('class_id')
  const selectedClass = classes.find((schoolClass) => String(schoolClass.id) === selectedClassId) ?? null

  return (
    <Modal title={homework ? 'Edit Homework' : 'Add Homework'} size="lg" onClose={onClose}>
      <form
        onSubmit={handleSubmit((values) =>
          onSubmit(
            {
              academic_session_id: values.academic_session_id ? Number(values.academic_session_id) : null,
              class_id: Number(values.class_id),
              section_id: values.section_id ? Number(values.section_id) : null,
              subject_id: values.subject_id ? Number(values.subject_id) : null,
              title: values.title,
              instructions: values.instructions || null,
              assigned_date: values.assigned_date,
              due_date: values.due_date || null,
              submission_required: values.submission_required,
              status: values.status,
            },
            attachment,
          ),
        )}
        className="space-y-4"
      >
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Academic Session" htmlFor="hw_session">
            <select id="hw_session" className={inputClass} {...register('academic_session_id')}>
              <option value="">No session</option>
              {academicSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Class" htmlFor="hw_class" error={errors.class_id}>
            <select id="hw_class" className={inputClass} {...register('class_id', { required: 'Class is required.' })}>
              <option value="">Select class</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Section" htmlFor="hw_section">
            <select id="hw_section" className={inputClass} disabled={!selectedClass} {...register('section_id')}>
              <option value="">All sections</option>
              {selectedClass?.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  Section {section.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Subject" htmlFor="hw_subject">
            <select id="hw_subject" className={inputClass} {...register('subject_id')}>
              <option value="">General</option>
              {subjectsForClass(subjects, selectedClassId).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Title" htmlFor="hw_title" error={errors.title}>
          <input id="hw_title" className={inputClass} {...register('title', { required: 'Title is required.' })} />
        </FormField>

        <FormField label="Instructions" htmlFor="hw_instructions">
          <textarea id="hw_instructions" rows={4} className={inputClass} {...register('instructions')} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Assigned Date" htmlFor="hw_assigned" error={errors.assigned_date}>
            <input id="hw_assigned" type="date" className={inputClass} {...register('assigned_date', { required: 'Assigned date is required.' })} />
          </FormField>
          <FormField label="Due Date" htmlFor="hw_due">
            <input id="hw_due" type="date" className={inputClass} {...register('due_date')} />
          </FormField>
          <FormField label="Status" htmlFor="hw_status">
            <select id="hw_status" className={inputClass} {...register('status')}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-2 text-[0.85rem] text-ink/70">
            <input type="checkbox" className="h-4 w-4 rounded border-line text-accent" {...register('submission_required')} />
            Student submission required
          </label>
          <input
            type="file"
            onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
            className="text-[0.82rem] text-ink/55 file:mr-3 file:rounded-lg file:border-0 file:bg-paper-2 file:px-3 file:py-2 file:text-[0.78rem] file:font-semibold file:text-ink/65"
            aria-label="Homework attachment"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function subjectsForClass(subjects: Subject[], classId: string): Subject[] {
  if (!classId) return subjects
  return subjects.filter((subject) => subject.classes.some((schoolClass) => String(schoolClass.id) === classId))
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { extractErrorMessage } from '@/lib/errors'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { PlusIcon } from '../../components/icons'
import { TabSkeleton, ErrorState } from './TabStates'
import {
  fetchSubjects,
  fetchClasses,
  createSubject,
  updateSubject,
  deleteSubject,
  syncSubjectClasses,
} from '../api'
import type { Subject, SubjectPayload } from '../types'

interface Props {
  canEdit: boolean
}

export default function SubjectsTab({ canEdit }: Props) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subjects'],
    queryFn: fetchSubjects,
  })

  const [subjectModal, setSubjectModal] = useState<Subject | 'new' | null>(null)
  const [assignModal, setAssignModal] = useState<Subject | null>(null)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['subjects'] })

  const saveMutation = useMutation({
    mutationFn: (vars: { id?: number; payload: SubjectPayload }) =>
      vars.id ? updateSubject(vars.id, vars.payload) : createSubject(vars.payload),
    onSuccess: () => {
      invalidate()
      setSubjectModal(null)
      setError(null)
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: invalidate,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const syncMutation = useMutation({
    mutationFn: (vars: { id: number; classIds: number[] }) => syncSubjectClasses(vars.id, vars.classIds),
    onSuccess: () => {
      invalidate()
      setAssignModal(null)
      setError(null)
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  if (isLoading) return <TabSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const subjects = data ?? []

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSubjectModal('new')}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
          >
            <PlusIcon width={16} height={16} />
            Add Subject
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
              <th className="px-5 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Classes</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              {canEdit && <th className="px-5 py-3 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-6 py-10 text-center text-ink/40">
                  No subjects yet.
                </td>
              </tr>
            ) : (
              subjects.map((subject) => (
                <tr key={subject.id} className="border-b border-line/60 last:border-0 hover:bg-paper/50">
                  <td className="px-5 py-3 font-medium text-ink">{subject.name}</td>
                  <td className="px-4 py-3 text-ink/65">{subject.code ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-ink/65">{subject.type}</td>
                  <td className="px-4 py-3 text-ink/65">
                    {subject.classes.length === 0 ? '—' : subject.classes.map((c) => c.name).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={subject.status} />
                  </td>
                  {canEdit && (
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setAssignModal(subject)}
                          className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent"
                        >
                          Assign Classes
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectModal(subject)}
                          className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete subject "${subject.name}"?`)) {
                              deleteMutation.mutate(subject.id)
                            }
                          }}
                          className="text-[0.78rem] font-semibold text-[#dc2626] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {subjectModal && (
        <SubjectFormModal
          subject={subjectModal === 'new' ? null : subjectModal}
          onClose={() => {
            setSubjectModal(null)
            setError(null)
          }}
          onSubmit={(payload) =>
            saveMutation.mutate({ id: subjectModal === 'new' ? undefined : subjectModal.id, payload })
          }
          isSaving={saveMutation.isPending}
          error={error}
        />
      )}

      {assignModal && (
        <AssignClassesModal
          subject={assignModal}
          onClose={() => {
            setAssignModal(null)
            setError(null)
          }}
          onSubmit={(classIds) => syncMutation.mutate({ id: assignModal.id, classIds })}
          isSaving={syncMutation.isPending}
          error={error}
        />
      )}
    </div>
  )
}

function SubjectFormModal({
  subject,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  subject: Subject | null
  onClose: () => void
  onSubmit: (payload: SubjectPayload) => void
  isSaving: boolean
  error: string | null
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubjectPayload>({
    defaultValues: subject
      ? { name: subject.name, code: subject.code ?? '', type: subject.type, status: subject.status }
      : { name: '', code: '', type: 'theory', status: 'active' },
  })

  return (
    <Modal title={subject ? 'Edit Subject' : 'Add Subject'} description="e.g. Mathematics, Science" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <FormField label="Subject Name" htmlFor="subject_name" error={errors.name}>
          <input
            id="subject_name"
            className={inputClass}
            placeholder="Mathematics"
            {...register('name', { required: 'Subject name is required.' })}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Code" htmlFor="subject_code" error={errors.code} hint="Optional, e.g. MATH">
            <input id="subject_code" className={inputClass} {...register('code')} />
          </FormField>

          <FormField label="Type" htmlFor="subject_type" error={errors.type}>
            <select id="subject_type" className={inputClass} {...register('type')}>
              <option value="theory">Theory</option>
              <option value="practical">Practical</option>
            </select>
          </FormField>
        </div>

        {subject && (
          <FormField label="Status" htmlFor="subject_status" error={errors.status}>
            <select id="subject_status" className={inputClass} {...register('status')}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </FormField>
        )}

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
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AssignClassesModal({
  subject,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  subject: Subject
  onClose: () => void
  onSubmit: (classIds: number[]) => void
  isSaving: boolean
  error: string | null
}) {
  const { data: classes, isLoading } = useQuery({ queryKey: ['classes'], queryFn: fetchClasses })
  const [selected, setSelected] = useState<number[]>(subject.classes.map((c) => c.id))

  const toggle = (classId: number) => {
    setSelected((prev) => (prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]))
  }

  return (
    <Modal title={`Assign Classes — ${subject.name}`} description="Select the classes that teach this subject." onClose={onClose}>
      <div className="space-y-4">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        {isLoading ? (
          <p className="text-[0.85rem] text-ink/50">Loading classes…</p>
        ) : (classes ?? []).length === 0 ? (
          <p className="text-[0.85rem] text-ink/50">No classes have been created yet.</p>
        ) : (
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {(classes ?? []).map((schoolClass) => (
              <label
                key={schoolClass.id}
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[0.85rem] text-ink/80"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(schoolClass.id)}
                  onChange={() => toggle(schoolClass.id)}
                  className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30"
                />
                {schoolClass.name}
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(selected)}
            disabled={isSaving}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

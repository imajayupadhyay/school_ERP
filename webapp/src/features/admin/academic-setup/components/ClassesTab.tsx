import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { extractErrorMessage } from '@/lib/errors'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { PlusIcon, ChevronDownIcon } from '../../components/icons'
import { TabSkeleton, ErrorState } from './TabStates'
import {
  fetchClasses,
  createClass,
  updateClass,
  deleteClass,
  createSection,
  updateSection,
  deleteSection,
} from '../api'
import type { ClassPayload, SchoolClass, Section, SectionPayload } from '../types'

interface Props {
  canEdit: boolean
}

export default function ClassesTab({ canEdit }: Props) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
  })

  const [expanded, setExpanded] = useState<number | null>(null)
  const [classModal, setClassModal] = useState<SchoolClass | 'new' | null>(null)
  const [sectionModal, setSectionModal] = useState<{ classId: number; section: Section | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['classes'] })

  const saveClassMutation = useMutation({
    mutationFn: (vars: { id?: number; payload: ClassPayload }) =>
      vars.id ? updateClass(vars.id, vars.payload) : createClass(vars.payload),
    onSuccess: () => {
      invalidate()
      setClassModal(null)
      setError(null)
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const deleteClassMutation = useMutation({
    mutationFn: deleteClass,
    onSuccess: invalidate,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const saveSectionMutation = useMutation({
    mutationFn: (vars: { id?: number; payload: SectionPayload }) =>
      vars.id ? updateSection(vars.id, vars.payload) : createSection(vars.payload),
    onSuccess: () => {
      invalidate()
      setSectionModal(null)
      setError(null)
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const deleteSectionMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: invalidate,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  if (isLoading) return <TabSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const classes = data ?? []

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setClassModal('new')}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
          >
            <PlusIcon width={16} height={16} />
            Add Class
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
              <th className="px-5 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold">Sections</th>
              <th className="px-4 py-3 font-semibold">Subjects</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              {canEdit && <th className="px-5 py-3 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-6 py-10 text-center text-ink/40">
                  No classes yet.
                </td>
              </tr>
            ) : (
              classes.map((schoolClass) => (
                <ClassRow
                  key={schoolClass.id}
                  schoolClass={schoolClass}
                  canEdit={canEdit}
                  expanded={expanded === schoolClass.id}
                  onToggle={() => setExpanded(expanded === schoolClass.id ? null : schoolClass.id)}
                  onEdit={() => setClassModal(schoolClass)}
                  onDelete={() => {
                    if (window.confirm(`Delete class "${schoolClass.name}"? This also removes its sections.`)) {
                      deleteClassMutation.mutate(schoolClass.id)
                    }
                  }}
                  onAddSection={() => setSectionModal({ classId: schoolClass.id, section: null })}
                  onEditSection={(section) => setSectionModal({ classId: schoolClass.id, section })}
                  onDeleteSection={(section) => {
                    if (window.confirm(`Delete section "${section.name}"?`)) {
                      deleteSectionMutation.mutate(section.id)
                    }
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {classModal && (
        <ClassFormModal
          schoolClass={classModal === 'new' ? null : classModal}
          onClose={() => {
            setClassModal(null)
            setError(null)
          }}
          onSubmit={(payload) =>
            saveClassMutation.mutate({ id: classModal === 'new' ? undefined : classModal.id, payload })
          }
          isSaving={saveClassMutation.isPending}
          error={error}
        />
      )}

      {sectionModal && (
        <SectionFormModal
          classId={sectionModal.classId}
          section={sectionModal.section}
          onClose={() => {
            setSectionModal(null)
            setError(null)
          }}
          onSubmit={(payload) =>
            saveSectionMutation.mutate({ id: sectionModal.section?.id, payload })
          }
          isSaving={saveSectionMutation.isPending}
          error={error}
        />
      )}
    </div>
  )
}

function ClassRow({
  schoolClass,
  canEdit,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddSection,
  onEditSection,
  onDeleteSection,
}: {
  schoolClass: SchoolClass
  canEdit: boolean
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddSection: () => void
  onEditSection: (section: Section) => void
  onDeleteSection: (section: Section) => void
}) {
  return (
    <>
      <tr className="border-b border-line/60 hover:bg-paper/50">
        <td className="px-5 py-3">
          <button type="button" onClick={onToggle} className="flex items-center gap-2 font-medium text-ink">
            <ChevronDownIcon
              width={16}
              height={16}
              className={`shrink-0 text-ink/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
            {schoolClass.name}
          </button>
        </td>
        <td className="px-4 py-3 text-ink/65">{schoolClass.sections.length}</td>
        <td className="px-4 py-3 text-ink/65">{schoolClass.subjects.length}</td>
        <td className="px-4 py-3">
          <StatusBadge status={schoolClass.status} />
        </td>
        {canEdit && (
          <td className="px-5 py-3 text-right">
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onEdit} className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent">
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="text-[0.78rem] font-semibold text-[#dc2626] hover:underline"
              >
                Delete
              </button>
            </div>
          </td>
        )}
      </tr>
      {expanded && (
        <tr className="border-b border-line/60 bg-paper/40">
          <td colSpan={canEdit ? 5 : 4} className="px-5 py-4 sm:px-8">
            <div className="flex items-center justify-between">
              <h4 className="text-[0.8rem] font-semibold uppercase tracking-wider text-ink/45">Sections</h4>
              {canEdit && (
                <button
                  type="button"
                  onClick={onAddSection}
                  className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-accent hover:underline"
                >
                  <PlusIcon width={14} height={14} />
                  Add Section
                </button>
              )}
            </div>

            {schoolClass.sections.length === 0 ? (
              <p className="mt-2 text-[0.82rem] text-ink/40">No sections yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {schoolClass.sections.map((section) => (
                  <li
                    key={section.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-ink">Section {section.name}</span>
                      {section.capacity != null && (
                        <span className="text-[0.78rem] text-ink/50">Capacity: {section.capacity}</span>
                      )}
                      <StatusBadge status={section.status} />
                    </div>
                    {canEdit && (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => onEditSection(section)}
                          className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSection(section)}
                          className="text-[0.78rem] font-semibold text-[#dc2626] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {schoolClass.subjects.length > 0 && (
              <div className="mt-4">
                <h4 className="text-[0.8rem] font-semibold uppercase tracking-wider text-ink/45">Assigned Subjects</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {schoolClass.subjects.map((subject) => (
                    <span
                      key={subject.id}
                      className="rounded-full bg-paper-2 px-3 py-1 text-[0.78rem] font-medium text-ink/70"
                    >
                      {subject.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function ClassFormModal({
  schoolClass,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  schoolClass: SchoolClass | null
  onClose: () => void
  onSubmit: (payload: ClassPayload) => void
  isSaving: boolean
  error: string | null
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassPayload>({
    defaultValues: schoolClass
      ? { name: schoolClass.name, sequence: schoolClass.sequence, status: schoolClass.status }
      : { name: '', sequence: 0, status: 'active' },
  })

  return (
    <Modal title={schoolClass ? 'Edit Class' : 'Add Class'} description="e.g. Class 5, Grade 10" onClose={onClose}>
      <form
        onSubmit={handleSubmit((values) => onSubmit({ ...values, sequence: Number(values.sequence) }))}
        className="space-y-4"
      >
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <FormField label="Class Name" htmlFor="class_name" error={errors.name}>
          <input
            id="class_name"
            className={inputClass}
            placeholder="Class 5"
            {...register('name', { required: 'Class name is required.' })}
          />
        </FormField>

        <FormField label="Display Order" htmlFor="class_sequence" error={errors.sequence} hint="Lower numbers appear first.">
          <input
            id="class_sequence"
            type="number"
            className={inputClass}
            {...register('sequence', { valueAsNumber: true })}
          />
        </FormField>

        {schoolClass && (
          <FormField label="Status" htmlFor="class_status" error={errors.status}>
            <select id="class_status" className={inputClass} {...register('status')}>
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

function SectionFormModal({
  classId,
  section,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  classId: number
  section: Section | null
  onClose: () => void
  onSubmit: (payload: SectionPayload) => void
  isSaving: boolean
  error: string | null
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SectionPayload>({
    defaultValues: section
      ? { class_id: classId, name: section.name, capacity: section.capacity ?? undefined, status: section.status }
      : { class_id: classId, name: '', capacity: undefined, status: 'active' },
  })

  return (
    <Modal title={section ? 'Edit Section' : 'Add Section'} description="e.g. A, B, C" onClose={onClose}>
      <form
        onSubmit={handleSubmit((values) =>
          onSubmit({
            ...values,
            class_id: classId,
            capacity: values.capacity ? Number(values.capacity) : null,
          }),
        )}
        className="space-y-4"
      >
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <FormField label="Section Name" htmlFor="section_name" error={errors.name}>
          <input
            id="section_name"
            className={inputClass}
            placeholder="A"
            {...register('name', { required: 'Section name is required.' })}
          />
        </FormField>

        <FormField label="Capacity" htmlFor="section_capacity" error={errors.capacity} hint="Optional maximum number of students.">
          <input
            id="section_capacity"
            type="number"
            className={inputClass}
            {...register('capacity', { valueAsNumber: true })}
          />
        </FormField>

        {section && (
          <FormField label="Status" htmlFor="section_status" error={errors.status}>
            <select id="section_status" className={inputClass} {...register('status')}>
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

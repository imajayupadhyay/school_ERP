import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { extractErrorMessage } from '@/lib/errors'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { ChevronDownIcon, EditIcon, PlusIcon, SectionsIcon, TrashIcon } from '../../components/icons'
import { AddButton, EmptyRow, ErrorState, RowAction, TabSkeleton } from './TabStates'
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
          <AddButton label="Add Class" onClick={() => setClassModal('new')} />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full text-left text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
              <th className="px-5 py-3.5 font-bold">Class</th>
              <th className="px-4 py-3.5 font-bold">Sections</th>
              <th className="px-4 py-3.5 font-bold">Subjects</th>
              <th className="px-4 py-3.5 font-bold">Status</th>
              {canEdit && <th className="px-5 py-3.5 text-right font-bold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <EmptyRow colSpan={canEdit ? 5 : 4} message="No classes yet." />
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
      <tr
        className={`group border-b border-line/60 transition-colors ${expanded ? 'bg-accent/[0.04]' : 'hover:bg-accent/[0.035]'}`}
      >
        <td className="px-5 py-3">
          <button type="button" onClick={onToggle} className="flex items-center gap-2.5 font-semibold text-ink">
            <span
              className={`grid h-6 w-6 place-items-center rounded-md transition ${
                expanded ? 'bg-accent/15 text-accent' : 'bg-[#2c49a6]/10 text-[#2c49a6] group-hover:bg-[#2c49a6]/18'
              }`}
            >
              <ChevronDownIcon
                width={15}
                height={15}
                className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </span>
            {schoolClass.name}
          </button>
        </td>
        <td className="px-4 py-3">
          <CountPill value={schoolClass.sections.length} label="section" />
        </td>
        <td className="px-4 py-3">
          <CountPill value={schoolClass.subjects.length} label="subject" />
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={schoolClass.status} />
        </td>
        {canEdit && (
          <td className="px-5 py-3">
            <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
              <RowAction label="Edit" onClick={onEdit}>
                <EditIcon width={17} height={17} />
              </RowAction>
              <RowAction label="Delete" danger onClick={onDelete}>
                <TrashIcon width={17} height={17} />
              </RowAction>
            </div>
          </td>
        )}
      </tr>
      {expanded && (
        <tr className="border-b border-line/60 bg-paper/40">
          <td colSpan={canEdit ? 5 : 4} className="px-5 py-4 sm:px-8">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-ink/45">
                <SectionsIcon width={15} height={15} className="text-accent" />
                Sections
              </h4>
              {canEdit && (
                <button
                  type="button"
                  onClick={onAddSection}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[0.76rem] font-semibold text-ink/60 transition hover:border-accent hover:text-accent"
                >
                  <PlusIcon width={14} height={14} />
                  Add Section
                </button>
              )}
            </div>

            {schoolClass.sections.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-white/60 px-4 py-3 text-[0.82rem] text-ink/40">
                No sections yet.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {schoolClass.sections.map((section) => (
                  <li
                    key={section.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-2.5 transition hover:border-accent/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-paper-2 text-[0.78rem] font-bold text-ink/60">
                        {section.name}
                      </span>
                      <div>
                        <div className="text-[0.84rem] font-semibold text-ink">Section {section.name}</div>
                        {section.capacity != null && (
                          <div className="text-[0.72rem] text-ink/45">Capacity {section.capacity}</div>
                        )}
                      </div>
                      <StatusBadge status={section.status} />
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <RowAction label="Edit section" onClick={() => onEditSection(section)}>
                          <EditIcon width={16} height={16} />
                        </RowAction>
                        <RowAction label="Delete section" danger onClick={() => onDeleteSection(section)}>
                          <TrashIcon width={16} height={16} />
                        </RowAction>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {schoolClass.subjects.length > 0 && (
              <div className="mt-4">
                <h4 className="flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-ink/45">
                  Assigned Subjects
                </h4>
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

function CountPill({ value, label }: { value: number; label: string }) {
  if (value === 0) {
    return <span className="text-[0.8rem] text-ink/35">None</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-[0.76rem] font-semibold text-ink/60">
      <span className="text-ink/80">{value}</span>
      {value === 1 ? label : `${label}s`}
    </span>
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

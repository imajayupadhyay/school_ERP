import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { extractErrorMessage } from '@/lib/errors'
import { fetchAcademicSessions, fetchClasses } from '@/features/admin/academic-setup/api'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { EditIcon, FilterIcon, TrashIcon } from '../../components/icons'
import {
  createFeeStructure,
  deleteFeeStructure,
  fetchFeeHeads,
  fetchFeeStructures,
  updateFeeStructure,
} from '../api'
import { FREQUENCY_LABELS, type FeeStructure, type FeeStructurePayload, type Frequency } from '../types'
import { AddButton, FeeErrorState, FeeTableSkeleton, RowAction } from './FeeStates'

const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as Frequency[]

export default function StructuresTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<FeeStructure | 'new' | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [sessionFilter, setSessionFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')

  const { data: sessions } = useQuery({ queryKey: ['academic-sessions'], queryFn: fetchAcademicSessions })
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: fetchClasses })
  const { data: feeHeads } = useQuery({ queryKey: ['fee-heads'], queryFn: () => fetchFeeHeads() })

  const params = {
    academic_session_id: sessionFilter ? Number(sessionFilter) : undefined,
    class_id: classFilter ? Number(classFilter) : undefined,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['fee-structures', params],
    queryFn: () => fetchFeeStructures(params),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fee-structures'] })

  const saveMutation = useMutation({
    mutationFn: (vars: { id?: number; payload: FeeStructurePayload }) =>
      vars.id ? updateFeeStructure(vars.id, vars.payload) : createFeeStructure(vars.payload),
    onSuccess: () => {
      invalidate()
      setModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFeeStructure,
    onSuccess: invalidate,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const structures = data ?? []
  const hasFeeHeads = (feeHeads ?? []).length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
            <FilterIcon width={16} height={16} className="text-accent" />
            Filters
          </span>
          <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} className={`${inputClass} w-auto`} aria-label="Session">
            <option value="">All sessions</option>
            {sessions?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={`${inputClass} w-auto`} aria-label="Class">
            <option value="">All classes</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {canEdit && (
          <AddButton
            label="Add Fee Structure"
            disabled={!hasFeeHeads}
            title={hasFeeHeads ? undefined : 'Add at least one fee head first'}
            onClick={() => {
              setModalError(null)
              setModal('new')
            }}
          />
        )}
      </div>

      {canEdit && !hasFeeHeads && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          Add at least one fee head in the <strong>Fee Heads</strong> tab before creating a structure.
        </div>
      )}

      {isLoading ? (
        <FeeTableSkeleton rows={5} />
      ) : isError ? (
        <FeeErrorState onRetry={() => refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                <th className="px-5 py-3.5 font-bold">Name</th>
                <th className="px-4 py-3.5 font-bold">Session</th>
                <th className="px-4 py-3.5 font-bold">Class</th>
                <th className="px-4 py-3.5 font-bold">Components</th>
                <th className="px-4 py-3.5 font-bold">Status</th>
                {canEdit && <th className="px-5 py-3.5 text-right font-bold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {structures.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">
                    No fee structures match the current filters.
                  </td>
                </tr>
              ) : (
                structures.map((structure) => (
                  <tr key={structure.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                    <td className="px-5 py-3 font-semibold text-ink">{structure.name}</td>
                    <td className="px-4 py-3 text-ink/65">{structure.academic_session?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {structure.class?.name ? (
                        <span className="text-ink/65">{structure.class.name}</span>
                      ) : (
                        <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[0.7rem] font-bold text-[#b45309]">School-wide</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-[0.76rem] font-semibold text-ink/60">
                        <span className="text-ink/80">{structure.items_count ?? structure.items?.length ?? 0}</span>
                        components
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={structure.status} />
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                          <RowAction
                            label="Edit"
                            onClick={() => {
                              setModalError(null)
                              setModal(structure)
                            }}
                          >
                            <EditIcon width={17} height={17} />
                          </RowAction>
                          <RowAction
                            label="Delete"
                            danger
                            onClick={() => {
                              if (window.confirm(`Delete structure "${structure.name}"?`)) deleteMutation.mutate(structure.id)
                            }}
                          >
                            <TrashIcon width={17} height={17} />
                          </RowAction>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <FeeStructureModal
          structure={modal === 'new' ? null : modal}
          sessions={(sessions ?? []).map((s) => ({ id: s.id, name: s.name }))}
          classes={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
          feeHeads={(feeHeads ?? []).map((h) => ({ id: h.id, name: h.name }))}
          onClose={() => {
            setModal(null)
            setModalError(null)
          }}
          onSubmit={(payload) => saveMutation.mutate({ id: modal === 'new' ? undefined : modal.id, payload })}
          isSaving={saveMutation.isPending}
          error={modalError}
        />
      )}
    </div>
  )
}

interface ItemForm {
  fee_head_id: string
  amount: string
  frequency: Frequency
  is_optional: boolean
}

function FeeStructureModal({
  structure,
  sessions,
  classes,
  feeHeads,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  structure: FeeStructure | null
  sessions: { id: number; name: string }[]
  classes: { id: number; name: string }[]
  feeHeads: { id: number; name: string }[]
  onClose: () => void
  onSubmit: (payload: FeeStructurePayload) => void
  isSaving: boolean
  error: string | null
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<{
    academic_session_id: string
    class_id: string
    name: string
    status: string
    items: ItemForm[]
  }>({
    defaultValues: structure
      ? {
          academic_session_id: String(structure.academic_session_id),
          class_id: structure.class_id ? String(structure.class_id) : '',
          name: structure.name,
          status: structure.status,
          items: (structure.items ?? []).map((i) => ({
            fee_head_id: String(i.fee_head_id),
            amount: String(i.amount),
            frequency: i.frequency,
            is_optional: i.is_optional,
          })),
        }
      : {
          academic_session_id: sessions[0] ? String(sessions[0].id) : '',
          class_id: '',
          name: '',
          status: 'active',
          items: [{ fee_head_id: feeHeads[0] ? String(feeHeads[0].id) : '', amount: '', frequency: 'monthly', is_optional: false }],
        },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  return (
    <Modal title={structure ? 'Edit Fee Structure' : 'Add Fee Structure'} onClose={onClose} size="lg">
      <form
        onSubmit={handleSubmit((values) =>
          onSubmit({
            academic_session_id: Number(values.academic_session_id),
            class_id: values.class_id ? Number(values.class_id) : null,
            name: values.name,
            status: values.status,
            items: values.items.map((i) => ({
              fee_head_id: Number(i.fee_head_id),
              amount: Number(i.amount),
              frequency: i.frequency,
              is_optional: i.is_optional,
            })),
          }),
        )}
        className="space-y-5"
      >
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Academic Session" htmlFor="academic_session_id" error={errors.academic_session_id}>
            <select
              id="academic_session_id"
              className={inputClass}
              {...register('academic_session_id', { required: 'Session is required' })}
            >
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Class" htmlFor="class_id" hint="Leave blank for a school-wide structure">
            <select id="class_id" className={inputClass} {...register('class_id')}>
              <option value="">School-wide</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Structure Name" htmlFor="name" error={errors.name}>
            <input id="name" className={inputClass} placeholder="e.g. Class 5 Fees 2026-27" {...register('name', { required: 'Name is required' })} />
          </FormField>
          <FormField label="Status" htmlFor="status">
            <select id="status" className={inputClass} {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
        </div>

        <div className="rounded-2xl border border-line bg-paper/35 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[0.72rem] font-semibold uppercase tracking-wider text-ink/45">Fee Components</h3>
            <button
              type="button"
              onClick={() => append({ fee_head_id: feeHeads[0] ? String(feeHeads[0].id) : '', amount: '', frequency: 'monthly', is_optional: false })}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
            >
              + Add line
            </button>
          </div>

          <div className="space-y-2">
            {/* Column labels (desktop) so each control is identifiable */}
            <div className="hidden gap-2 px-1 text-[0.68rem] font-semibold uppercase tracking-wider text-ink/40 sm:grid sm:grid-cols-[1fr_120px_140px_auto]">
              <span>Fee Head</span>
              <span>Amount</span>
              <span>Frequency</span>
              <span />
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_140px_auto]">
                <select className={inputClass} {...register(`items.${index}.fee_head_id`, { required: true })} aria-label="Fee head">
                  {feeHeads.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  className={inputClass}
                  {...register(`items.${index}.amount`, { required: true })}
                />
                <select className={inputClass} {...register(`items.${index}.frequency`)} aria-label="Frequency">
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                  className="rounded-lg px-2 text-[0.78rem] font-semibold text-[#dc2626] hover:underline disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.74rem] text-ink/40">
            Amount is per occurrence (e.g. a monthly fee bills once each month). Optional heads are not billed automatically.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-1">
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
            {isSaving ? 'Saving…' : 'Save Structure'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { extractErrorMessage } from '@/lib/errors'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { EditIcon, TrashIcon } from '../../components/icons'
import { createFeeHead, deleteFeeHead, fetchFeeHeads, updateFeeHead } from '../api'
import type { FeeHead, FeeHeadPayload } from '../types'
import { AddButton, FeeErrorState, FeeTableSkeleton, RowAction } from './FeeStates'

export default function FeeHeadsTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<FeeHead | 'new' | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['fee-heads'],
    queryFn: () => fetchFeeHeads(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fee-heads'] })

  const saveMutation = useMutation({
    mutationFn: (vars: { id?: number; payload: FeeHeadPayload }) =>
      vars.id ? updateFeeHead(vars.id, vars.payload) : createFeeHead(vars.payload),
    onSuccess: () => {
      invalidate()
      setModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFeeHead,
    onSuccess: invalidate,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const heads = data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[0.9rem] text-ink/55">
          Fee components such as Tuition, Transport, Admission, or Exam — the building blocks of a fee structure.
        </p>
        {canEdit && (
          <AddButton
            label="Add Fee Head"
            onClick={() => {
              setModalError(null)
              setModal('new')
            }}
          />
        )}
      </div>

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
                <th className="px-4 py-3.5 font-bold">Code</th>
                <th className="px-4 py-3.5 font-bold">Type</th>
                <th className="px-4 py-3.5 font-bold">Status</th>
                {canEdit && <th className="px-5 py-3.5 text-right font-bold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {heads.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">
                    No fee heads yet. Add one to start building fee structures.
                  </td>
                </tr>
              ) : (
                heads.map((head) => (
                  <tr key={head.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                    <td className="px-5 py-3 font-semibold text-ink">{head.name}</td>
                    <td className="px-4 py-3 text-ink/65">
                      {head.code ? (
                        <span className="rounded-md bg-ink/[0.06] px-2 py-0.5 font-mono text-[0.78rem] text-ink/60">{head.code}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${
                          head.is_optional ? 'bg-[#2c49a6]/10 text-[#2c49a6]' : 'bg-ink/8 text-ink/55'
                        }`}
                      >
                        {head.is_optional ? 'Optional' : 'Mandatory'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={head.status} />
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                          <RowAction
                            label="Edit"
                            onClick={() => {
                              setModalError(null)
                              setModal(head)
                            }}
                          >
                            <EditIcon width={17} height={17} />
                          </RowAction>
                          <RowAction
                            label="Delete"
                            danger
                            onClick={() => {
                              if (window.confirm(`Delete fee head "${head.name}"?`)) deleteMutation.mutate(head.id)
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
        <FeeHeadModal
          head={modal === 'new' ? null : modal}
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

function FeeHeadModal({
  head,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  head: FeeHead | null
  onClose: () => void
  onSubmit: (payload: FeeHeadPayload) => void
  isSaving: boolean
  error: string | null
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ name: string; code: string; description: string; is_optional: boolean; status: string }>({
    defaultValues: head
      ? {
          name: head.name,
          code: head.code ?? '',
          description: head.description ?? '',
          is_optional: head.is_optional,
          status: head.status,
        }
      : { name: '', code: '', description: '', is_optional: false, status: 'active' },
  })

  return (
    <Modal title={head ? 'Edit Fee Head' : 'Add Fee Head'} onClose={onClose}>
      <form
        onSubmit={handleSubmit((values) =>
          onSubmit({
            name: values.name,
            code: values.code || null,
            description: values.description || null,
            is_optional: values.is_optional,
            status: values.status,
          }),
        )}
        className="space-y-4"
      >
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <FormField label="Name" htmlFor="name" error={errors.name}>
          <input id="name" className={inputClass} {...register('name', { required: 'Name is required' })} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Code" htmlFor="code">
            <input id="code" className={inputClass} placeholder="e.g. TUI" {...register('code')} />
          </FormField>
          <FormField label="Status" htmlFor="status">
            <select id="status" className={inputClass} {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
        </div>

        <FormField label="Description" htmlFor="description">
          <input id="description" className={inputClass} {...register('description')} />
        </FormField>

        <label className="flex items-center gap-2 text-[0.85rem] text-ink/70">
          <input type="checkbox" className="h-4 w-4 rounded border-line text-accent" {...register('is_optional')} />
          Optional fee (not billed automatically when assigned)
        </label>

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
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

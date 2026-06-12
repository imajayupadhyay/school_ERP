import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { extractErrorMessage } from '@/lib/errors'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { CheckIcon, EditIcon, StarIcon, TrashIcon } from '../../components/icons'
import { AddButton, EmptyRow, ErrorState, RowAction, TabSkeleton } from './TabStates'
import {
  fetchAcademicSessions,
  createAcademicSession,
  updateAcademicSession,
  deleteAcademicSession,
  setCurrentAcademicSession,
} from '../api'
import type { AcademicSession, AcademicSessionPayload } from '../types'

interface Props {
  canEdit: boolean
}

export default function SessionsTab({ canEdit }: Props) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: fetchAcademicSessions,
  })

  const [editing, setEditing] = useState<AcademicSession | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['academic-sessions'] })

  const saveMutation = useMutation({
    mutationFn: (vars: { id?: number; payload: AcademicSessionPayload }) =>
      vars.id ? updateAcademicSession(vars.id, vars.payload) : createAcademicSession(vars.payload),
    onSuccess: () => {
      invalidate()
      setEditing(null)
      setError(null)
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAcademicSession,
    onSuccess: invalidate,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const setCurrentMutation = useMutation({
    mutationFn: setCurrentAcademicSession,
    onSuccess: invalidate,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  if (isLoading) return <TabSkeleton />

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const sessions = data ?? []

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <AddButton label="Add Session" onClick={() => setEditing('new')} />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full text-left text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
              <th className="px-5 py-3.5 font-bold">Name</th>
              <th className="px-4 py-3.5 font-bold">Start Date</th>
              <th className="px-4 py-3.5 font-bold">End Date</th>
              <th className="px-4 py-3.5 font-bold">Status</th>
              <th className="px-4 py-3.5 font-bold">Current</th>
              {canEdit && <th className="px-5 py-3.5 text-right font-bold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <EmptyRow colSpan={canEdit ? 6 : 5} message="No academic sessions yet." />
            ) : (
              sessions.map((session) => (
                <tr
                  key={session.id}
                  className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5 font-semibold text-ink">
                      {session.is_current && <StarIcon width={15} height={15} className="text-[#d6991f]" />}
                      {session.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/65">{session.start_date}</td>
                  <td className="px-4 py-3 text-ink/65">{session.end_date}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="px-4 py-3">
                    {session.is_current ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 px-2.5 py-0.5 text-[0.72rem] font-semibold text-[#b45309]">
                        <StarIcon width={12} height={12} />
                        Current
                      </span>
                    ) : canEdit ? (
                      <button
                        type="button"
                        onClick={() => setCurrentMutation.mutate(session.id)}
                        disabled={setCurrentMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#168a66]/25 bg-[#168a66]/[0.07] px-2.5 py-1 text-[0.76rem] font-semibold text-[#168a66] transition hover:bg-[#168a66]/15 disabled:opacity-50"
                      >
                        <CheckIcon width={14} height={14} />
                        Set current
                      </button>
                    ) : (
                      <span className="text-ink/30">—</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                        <RowAction label="Edit" onClick={() => setEditing(session)}>
                          <EditIcon width={17} height={17} />
                        </RowAction>
                        <RowAction
                          label={session.is_current ? 'Current session can’t be deleted' : 'Delete'}
                          danger
                          disabled={session.is_current || deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete academic session "${session.name}"?`)) {
                              deleteMutation.mutate(session.id)
                            }
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

      {editing && (
        <SessionFormModal
          session={editing === 'new' ? null : editing}
          onClose={() => {
            setEditing(null)
            setError(null)
          }}
          onSubmit={(payload) =>
            saveMutation.mutate({ id: editing === 'new' ? undefined : editing.id, payload })
          }
          isSaving={saveMutation.isPending}
          error={error}
        />
      )}
    </div>
  )
}

function SessionFormModal({
  session,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  session: AcademicSession | null
  onClose: () => void
  onSubmit: (payload: AcademicSessionPayload) => void
  isSaving: boolean
  error: string | null
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcademicSessionPayload>({
    defaultValues: session
      ? { name: session.name, start_date: session.start_date, end_date: session.end_date, status: session.status }
      : { name: '', start_date: '', end_date: '', status: 'active' },
  })

  return (
    <Modal
      title={session ? 'Edit Academic Session' : 'Add Academic Session'}
      description="e.g. 2026-2027 academic year"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <FormField label="Session Name" htmlFor="session_name" error={errors.name}>
          <input
            id="session_name"
            className={inputClass}
            placeholder="2026-2027"
            {...register('name', { required: 'Session name is required.' })}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start Date" htmlFor="start_date" error={errors.start_date}>
            <input
              id="start_date"
              type="date"
              className={inputClass}
              {...register('start_date', { required: 'Start date is required.' })}
            />
          </FormField>

          <FormField label="End Date" htmlFor="end_date" error={errors.end_date}>
            <input
              id="end_date"
              type="date"
              className={inputClass}
              {...register('end_date', { required: 'End date is required.' })}
            />
          </FormField>
        </div>

        {session && (
          <FormField label="Status" htmlFor="session_status" error={errors.status}>
            <select id="session_status" className={inputClass} {...register('status')}>
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


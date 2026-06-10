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
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
          >
            <PlusIcon width={16} height={16} />
            Add Session
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Start Date</th>
              <th className="px-4 py-3 font-semibold">End Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Current</th>
              {canEdit && <th className="px-5 py-3 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-6 py-10 text-center text-ink/40">
                  No academic sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="border-b border-line/60 last:border-0 hover:bg-paper/50">
                  <td className="px-5 py-3 font-medium text-ink">{session.name}</td>
                  <td className="px-4 py-3 text-ink/65">{session.start_date}</td>
                  <td className="px-4 py-3 text-ink/65">{session.end_date}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="px-4 py-3">
                    {session.is_current ? (
                      <span className="inline-flex rounded-full bg-lime/15 px-2.5 py-0.5 text-[0.72rem] font-semibold text-[#b45309]">
                        Current
                      </span>
                    ) : canEdit ? (
                      <button
                        type="button"
                        onClick={() => setCurrentMutation.mutate(session.id)}
                        disabled={setCurrentMutation.isPending}
                        className="text-[0.78rem] font-semibold text-accent hover:underline disabled:opacity-50"
                      >
                        Set as current
                      </button>
                    ) : (
                      <span className="text-ink/30">—</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditing(session)}
                          className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete academic session "${session.name}"?`)) {
                              deleteMutation.mutate(session.id)
                            }
                          }}
                          disabled={session.is_current || deleteMutation.isPending}
                          className="text-[0.78rem] font-semibold text-[#dc2626] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
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


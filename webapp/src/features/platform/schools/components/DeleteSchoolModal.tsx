import { useState } from 'react'
import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from '@/features/admin/components/Modal'
import { inputClass } from '@/features/admin/components/FormField'
import { TrashIcon } from '@/features/admin/components/icons'
import { deleteSchool } from '../api'
import type { PlatformSchool } from '../types'

/**
 * Destructive confirmation: the admin must type the school's exact code to
 * enable deletion (the backend re-checks this too). Spells out everything that
 * will be permanently removed.
 */
export default function DeleteSchoolModal({
  school,
  onClose,
  onDeleted,
}: {
  school: PlatformSchool
  onClose: () => void
  onDeleted: (name: string) => void
}) {
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const matches = confirm.trim() === school.code

  const mutation = useMutation({
    mutationFn: () => deleteSchool(school.id, confirm.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'schools'] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'dashboard'] })
      onDeleted(school.name)
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError('Cannot reach the server. Make sure the API is running, then try again.')
          return
        }
        const data = err.response.data as { message?: string } | undefined
        setError(data?.message ?? 'Could not delete the school. Please try again.')
      } else {
        setError('Could not delete the school. Please try again.')
      }
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!matches || mutation.isPending) return
    setError(null)
    mutation.mutate()
  }

  const counts = [
    { label: 'students', value: school.students_count ?? 0 },
    { label: 'staff', value: school.employees_count ?? 0 },
    { label: 'user accounts', value: school.users_count ?? 0 },
  ].filter((c) => c.value > 0)

  return (
    <Modal title="Delete school" description="This permanently removes the school and everything in it." onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-[#dc2626]/25 bg-[#dc2626]/[0.06] px-4 py-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#dc2626]/12 text-[#dc2626]">
            <TrashIcon width={18} height={18} />
          </span>
          <div className="text-[0.85rem] text-[#991b1b]">
            <p className="font-semibold">This action cannot be undone.</p>
            <p className="mt-0.5 text-[#b91c1c]/90">
              All data for <b>{school.name}</b> ({school.code}) — admissions, fees, attendance, exams,
              timetables, staff, guardians, notices, audit logs and logins — will be permanently deleted.
              {counts.length > 0 && (
                <>
                  {' '}This includes{' '}
                  {counts.map((c, i) => (
                    <span key={c.label}>
                      {i > 0 && (i === counts.length - 1 ? ' and ' : ', ')}
                      <b>{c.value.toLocaleString()}</b> {c.label}
                    </span>
                  ))}
                  .
                </>
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-[#dc2626]/25 bg-[#dc2626]/[0.06] px-4 py-3 text-[0.85rem] text-[#b91c1c]">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-code" className="text-[0.82rem] font-semibold text-ink/70">
            Type <span className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-ink">{school.code}</span> to confirm
          </label>
          <input
            id="confirm-code"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={school.code}
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-ink/30"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!matches || mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#dc2626] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(220,38,38,.7)] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            <TrashIcon width={16} height={16} />
            Delete permanently
          </button>
        </div>
      </form>
    </Modal>
  )
}

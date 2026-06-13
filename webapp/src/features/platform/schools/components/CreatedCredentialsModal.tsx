import { useState } from 'react'
import Modal from '@/features/admin/components/Modal'
import type { CreateSchoolResult } from '../types'

/** Shown once after a school is created, surfacing the owner's sign-in details. */
export default function CreatedCredentialsModal({
  result,
  onClose,
}: {
  result: CreateSchoolResult
  onClose: () => void
}) {
  const rows: Array<{ label: string; value: string; secret?: boolean }> = [
    { label: 'School code', value: result.school.code },
    { label: 'Admin email', value: result.admin.email },
  ]
  if (result.temporary_password) {
    rows.push({ label: 'Temporary password', value: result.temporary_password, secret: true })
  }

  return (
    <Modal title="School created" description="Share these sign-in details with the school owner." onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-xl border border-[#168a66]/25 bg-[#168a66]/[0.06] px-4 py-3 text-[0.85rem] text-[#0f6b50]">
          <b>{result.school.name}</b> is ready. The owner can sign in at the school login.
        </div>

        <div className="divide-y divide-line/70 rounded-xl border border-line">
          {rows.map((row) => (
            <CopyRow key={row.label} label={row.label} value={row.value} secret={row.secret} />
          ))}
        </div>

        {result.temporary_password && (
          <p className="text-[0.78rem] text-ink/45">
            This password is shown only once and is not stored. The owner should change it after first sign-in.
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-ink/45">{label}</p>
        <p className={`mt-0.5 truncate text-[0.9rem] font-semibold text-ink ${secret ? 'font-mono' : ''}`}>{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg border border-line bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

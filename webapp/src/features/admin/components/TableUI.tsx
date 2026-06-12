import type { ReactNode } from 'react'
import { PlusIcon } from './icons'

export type RowActionTone = 'view' | 'edit' | 'danger' | 'success' | 'gold' | 'violet' | 'teal' | 'neutral'

/** Persistent soft-tinted colour per tone (static strings so Tailwind keeps them). */
const TONE_CLASSES: Record<RowActionTone, string> = {
  view: 'bg-[#2c49a6]/12 text-[#2c49a6] enabled:hover:bg-[#2c49a6]/22',
  edit: 'bg-accent/12 text-accent enabled:hover:bg-accent/22',
  danger: 'bg-[#dc2626]/10 text-[#dc2626] enabled:hover:bg-[#dc2626]/20',
  success: 'bg-[#168a66]/12 text-[#168a66] enabled:hover:bg-[#168a66]/22',
  gold: 'bg-[#d6991f]/18 text-[#b45309] enabled:hover:bg-[#d6991f]/28',
  violet: 'bg-[#7c3aed]/12 text-[#7c3aed] enabled:hover:bg-[#7c3aed]/22',
  teal: 'bg-[#0e7490]/12 text-[#0e7490] enabled:hover:bg-[#0e7490]/22',
  neutral: 'bg-ink/[0.06] text-ink/55 enabled:hover:bg-ink/12',
}

/** Infer a sensible colour from the action's label when no tone is given. */
function toneForLabel(label: string, danger: boolean): RowActionTone {
  if (danger) return 'danger'
  const l = label.toLowerCase()
  if (l.includes('delete') || l.includes('archive') || l.includes('remove') || l.includes('void')) return 'danger'
  if (l.includes('photo')) return 'violet'
  if (l.includes('transfer')) return 'teal'
  if (l.includes('assign')) return 'success'
  if (l.includes('reset') || l.includes('password') || l.includes('key')) return 'gold'
  if (l.includes('link') || l.includes('children') || l.includes('open') || l.includes('file')) return 'view'
  if (l.includes('view') || l.includes('detail') || l.includes('report') || l.includes('profile')) return 'view'
  if (l.includes('edit')) return 'edit'
  return 'edit'
}

/** Compact, colour-coded icon action button for table rows. */
export function RowAction({
  label,
  onClick,
  danger = false,
  disabled = false,
  tone,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  tone?: RowActionTone
  children: ReactNode
}) {
  const resolved = tone ?? toneForLabel(label, danger)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid h-8 w-8 place-items-center rounded-lg transition enabled:hover:scale-110 disabled:cursor-not-allowed disabled:!bg-transparent disabled:!text-ink/25 ${TONE_CLASSES[resolved]}`}
    >
      {children}
    </button>
  )
}

/** Saffron primary "Add …" button with a plus icon and hover lift. */
export function AddButton({
  label,
  onClick,
  disabled = false,
  title,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
    >
      <PlusIcon width={17} height={17} />
      {label}
    </button>
  )
}

/** Secondary (paper/outline) button used for nested add actions. */
export function SecondaryButton({
  label,
  onClick,
  icon,
  disabled = false,
}: {
  label: string
  onClick: () => void
  icon?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.82rem] font-semibold text-ink/65 transition hover:border-accent hover:bg-accent/5 hover:text-accent disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  )
}

/** Realistic table-shaped loading skeleton. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="border-b border-line bg-paper/60 px-5 py-3.5">
        <div className="h-3 w-24 animate-pulse rounded bg-ink/10" />
      </div>
      <div className="divide-y divide-line/60">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-5 py-3.5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-ink/[0.07]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 animate-pulse rounded bg-ink/[0.08]" />
              <div className="h-2.5 w-24 animate-pulse rounded bg-ink/[0.05]" />
            </div>
            <div className="hidden h-6 w-16 animate-pulse rounded-full bg-ink/[0.06] sm:block" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-ink/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Standard error card with retry. */
export function TableErrorState({
  message,
  onRetry,
  title = 'We couldn’t load this data.',
}: {
  message?: string
  onRetry: () => void
  title?: string
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-white py-16 text-center shadow-sm">
      <p className="font-semibold text-ink/75">{title}</p>
      {message && <p className="mt-1 max-w-md text-[0.85rem] text-ink/50">{message}</p>}
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
      >
        Try again
      </button>
    </div>
  )
}

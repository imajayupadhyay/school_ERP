import { PlusIcon, TrashIcon } from '../../components/icons'

export { RowAction } from '../../components/TableUI'

/** Realistic row skeleton for the fee tables. */
export function FeeTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4">
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
              <div className="hidden h-3 w-20 animate-pulse rounded bg-ink/[0.06] sm:block" />
              <div className="hidden h-6 w-16 animate-pulse rounded-full bg-ink/[0.06] md:block" />
              <div className="h-8 w-20 animate-pulse rounded-lg bg-ink/[0.05]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function FeeErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-white py-16 text-center shadow-sm">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#dc2626]/10 text-[#dc2626]">
        <TrashIcon width={26} height={26} />
      </span>
      <p className="mt-4 font-semibold text-ink/75">We couldn’t load this data.</p>
      <p className="mt-1 text-[0.85rem] text-ink/50">Check your connection and try again.</p>
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

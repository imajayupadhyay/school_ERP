export function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-32 self-end rounded-xl bg-ink/5" />
      <div className="h-[280px] rounded-2xl bg-ink/5" />
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-white py-20 text-center">
      <p className="text-ink/70">We couldn't load this data.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
      >
        Try again
      </button>
    </div>
  )
}

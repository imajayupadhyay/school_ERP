const STATUS_STYLES: Record<string, string> = {
  active: 'bg-accent/12 text-accent',
  archived: 'bg-ink/8 text-ink/55',
}

export default function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-ink/8 text-ink/55'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold capitalize ${cls}`}>
      {status}
    </span>
  )
}

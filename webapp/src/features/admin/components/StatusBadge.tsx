const STATUS_STYLES: Record<string, string> = {
  active: 'bg-accent/12 text-accent',
  archived: 'bg-ink/8 text-ink/55',
  inactive: 'bg-ink/8 text-ink/55',
  on_leave: 'bg-lime/15 text-[#b45309]',
  suspended: 'bg-[#dc2626]/10 text-[#dc2626]',
  terminated: 'bg-[#dc2626]/10 text-[#dc2626]',
  transferred: 'bg-[#2c49a6]/10 text-[#2c49a6]',
  alumni: 'bg-[#168a66]/10 text-[#168a66]',
  // Fee/invoice statuses
  paid: 'bg-[#168a66]/10 text-[#168a66]',
  partial: 'bg-lime/15 text-[#b45309]',
  pending: 'bg-ink/8 text-ink/55',
  overdue: 'bg-[#dc2626]/10 text-[#dc2626]',
  cancelled: 'bg-ink/8 text-ink/45',
}

export default function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-ink/8 text-ink/55'
  const label = status.replaceAll('_', ' ')

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold capitalize ${cls}`}>
      {label}
    </span>
  )
}

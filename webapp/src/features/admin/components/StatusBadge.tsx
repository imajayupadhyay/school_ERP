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
  // Attendance statuses
  present: 'bg-[#168a66]/10 text-[#168a66]',
  absent: 'bg-[#dc2626]/10 text-[#dc2626]',
  late: 'bg-lime/15 text-[#b45309]',
  half_day: 'bg-[#2c49a6]/10 text-[#2c49a6]',
  excused: 'bg-ink/8 text-ink/55',
  draft: 'bg-ink/8 text-ink/55',
  submitted: 'bg-[#168a66]/10 text-[#168a66]',
  published: 'bg-[#168a66]/10 text-[#168a66]',
  scheduled: 'bg-[#2c49a6]/10 text-[#2c49a6]',
  completed: 'bg-[#168a66]/10 text-[#168a66]',
  pass: 'bg-[#168a66]/10 text-[#168a66]',
  fail: 'bg-[#dc2626]/10 text-[#dc2626]',
  incomplete: 'bg-lime/15 text-[#b45309]',
  exempt: 'bg-ink/8 text-ink/55',
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

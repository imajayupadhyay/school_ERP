const STATUS_TONES: Record<string, string> = {
  active: 'bg-[#168a66]/12 text-[#168a66]',
  inactive: 'bg-ink/10 text-ink/55',
  suspended: 'bg-[#dc2626]/12 text-[#dc2626]',
  pending: 'bg-lime/15 text-[#b45309]',
}

/** Tinted status pill for school lifecycle states (active/inactive/suspended). */
export default function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONES[status.toLowerCase()] ?? 'bg-ink/10 text-ink/55'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.7rem] font-bold capitalize ${tone}`}>
      {status}
    </span>
  )
}

import type { ComponentType, SVGProps } from 'react'

interface StatCardProps {
  label: string
  value: number | string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  sublabel?: string
  /** Tailwind classes for the icon tile background + text. */
  tone?: string
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  sublabel,
  tone = 'bg-accent/12 text-accent',
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 transition hover:shadow-[0_14px_34px_rgba(19,28,61,.1)]">
      <div className="flex items-start justify-between">
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}>
          <Icon width={22} height={22} />
        </span>
      </div>
      <p className="mt-4 text-[2rem] font-extrabold leading-none tracking-[-0.02em] text-ink">
        {value}
      </p>
      <p className="mt-1.5 text-[0.86rem] font-medium text-ink/60">{label}</p>
      {sublabel && <p className="mt-0.5 text-[0.74rem] text-ink/40">{sublabel}</p>}
    </div>
  )
}

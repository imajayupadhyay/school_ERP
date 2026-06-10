import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  description?: string
  children: ReactNode
}

export default function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-[1.02rem] font-bold tracking-[-0.01em] text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[0.82rem] text-ink/50">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

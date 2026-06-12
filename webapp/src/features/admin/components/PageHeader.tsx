import type { ComponentType, ReactNode, SVGProps } from 'react'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/** Navy gradient header band with an icon tile, title, description, and optional actions/aside. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  aside,
}: {
  icon: Icon
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ink to-ink-soft px-6 py-6 text-paper shadow-[0_18px_40px_-24px_rgba(19,28,61,.55)]">
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-accent/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-lime/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper/10 text-paper ring-1 ring-paper/15 backdrop-blur">
            <Icon width={24} height={24} />
          </span>
          <div>
            <h1 className="text-[1.7rem] font-extrabold leading-tight tracking-[-0.02em]">{title}</h1>
            {description && <p className="mt-1 max-w-xl text-[0.9rem] text-paper/65">{description}</p>}
            {aside}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
      </div>
    </div>
  )
}

export interface TabDef<K extends string> {
  key: K
  label: string
  icon: Icon
  count?: number
}

/** Modern segmented tab control (rounded white container, saffron active pill). */
export function SegmentedTabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<K>[]
  active: K
  onChange: (key: K) => void
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-sm sm:flex-row sm:items-center">
      {tabs.map((tab) => {
        const isActive = active === tab.key
        const Icon = tab.icon
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-pressed={isActive}
            className={`group flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-[0.88rem] font-semibold transition ${
              isActive
                ? 'bg-accent text-white shadow-[0_8px_20px_-6px_rgba(238,106,44,.6)]'
                : 'text-ink/55 hover:bg-paper-2/70 hover:text-ink'
            }`}
          >
            <Icon
              width={18}
              height={18}
              className={isActive ? 'text-white' : 'text-ink/40 transition group-hover:text-accent'}
            />
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-ink/8 text-ink/55'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

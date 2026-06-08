import type { GenderSplit } from '../types'

interface Props {
  data: GenderSplit
}

const SEGMENTS: { key: keyof GenderSplit; label: string; color: string }[] = [
  { key: 'male', label: 'Boys', color: '#131c3d' },
  { key: 'female', label: 'Girls', color: '#ee6a2c' },
  { key: 'other', label: 'Other', color: '#d6991f' },
]

const R = 54
const C = 2 * Math.PI * R

/** Donut chart of student gender split, drawn with stacked SVG circle arcs. */
export default function GenderDonut({ data }: Props) {
  const total = data.male + data.female + data.other
  let offset = 0

  return (
    <div className="rounded-2xl border border-line bg-white p-5 md:p-6">
      <h3 className="text-[1.02rem] font-bold text-ink">Gender Distribution</h3>
      <p className="text-[0.78rem] text-ink/50">All enrolled students</p>

      <div className="mt-4 flex items-center gap-6">
        <div className="relative shrink-0">
          <svg width="148" height="148" viewBox="0 0 148 148">
            <circle cx="74" cy="74" r={R} fill="none" stroke="#f3e9d6" strokeWidth="16" />
            {total > 0 &&
              SEGMENTS.map((seg) => {
                const value = data[seg.key]
                if (value === 0) return null
                const len = (value / total) * C
                const dash = `${len} ${C - len}`
                const el = (
                  <circle
                    key={seg.key}
                    cx="74"
                    cy="74"
                    r={R}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="16"
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 74 74)"
                    strokeLinecap="butt"
                  />
                )
                offset += len
                return el
              })}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-[1.5rem] font-extrabold leading-none text-ink">{total}</span>
            <span className="text-[0.66rem] uppercase tracking-wider text-ink/45">Total</span>
          </div>
        </div>

        <ul className="flex-1 space-y-3">
          {SEGMENTS.map((seg) => {
            const value = data[seg.key]
            const pct = total > 0 ? Math.round((value / total) * 100) : 0
            return (
              <li key={seg.key} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: seg.color }} />
                <span className="text-[0.85rem] text-ink/70">{seg.label}</span>
                <span className="ml-auto text-[0.85rem] font-semibold text-ink">{value}</span>
                <span className="w-9 text-right text-[0.75rem] text-ink/45">{pct}%</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

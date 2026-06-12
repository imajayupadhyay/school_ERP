import { useId } from 'react'

interface Point {
  label: string
  value: number
}

interface Props {
  title: string
  subtitle?: string
  points: Point[]
  /** Hex colour for the line + gradient. */
  color?: string
  /** Format a value for the tooltip / peak label. */
  format?: (value: number) => string
  /** Optional headline shown top-right (e.g. a total). */
  headline?: string
}

const W = 620
const H = 200
const PAD_X = 16
const PAD_TOP = 20
const PAD_BOTTOM = 34

/** Dependency-free SVG area + line chart for monthly/temporal trends. */
export default function TrendChart({ title, subtitle, points, color = '#ee6a2c', format = String, headline }: Props) {
  const gradientId = useId()
  const max = Math.max(1, ...points.map((p) => p.value))
  const innerW = W - PAD_X * 2
  const innerH = H - PAD_TOP - PAD_BOTTOM
  const step = points.length > 1 ? innerW / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = PAD_X + (points.length > 1 ? step * i : innerW / 2)
    const y = PAD_TOP + innerH - (p.value / max) * innerH
    return { x, y, ...p }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${PAD_TOP + innerH} L ${coords[0].x.toFixed(1)} ${PAD_TOP + innerH} Z`
      : ''

  const hasData = points.some((p) => p.value > 0)

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.02rem] font-bold text-ink">{title}</h3>
          {subtitle && <p className="text-[0.78rem] text-ink/50">{subtitle}</p>}
        </div>
        {headline && (
          <span className="rounded-lg bg-ink/[0.04] px-3 py-1 text-[0.92rem] font-extrabold tracking-tight" style={{ color }}>
            {headline}
          </span>
        )}
      </div>

      {!hasData ? (
        <p className="py-12 text-center text-sm text-ink/40">No data for this period yet.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" preserveAspectRatio="none" role="img" aria-label={title}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.26" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* gridlines */}
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={PAD_TOP + innerH * t}
              y2={PAD_TOP + innerH * t}
              stroke="rgba(19,28,61,0.06)"
              strokeWidth="1"
            />
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {coords.map((c) => (
            <g key={c.label}>
              <circle cx={c.x} cy={c.y} r="4" fill="#fff" stroke={color} strokeWidth="2.5" />
              <title>{`${c.label}: ${format(c.value)}`}</title>
              <text x={c.x} y={H - 12} textAnchor="middle" className="fill-ink/45" style={{ fontSize: 13, fontWeight: 600 }}>
                {c.label}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}

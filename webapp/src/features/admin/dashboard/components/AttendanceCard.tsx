import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '../../components/icons'
import type { AttendanceToday, TrendPoint } from '../types'

interface Props {
  today: AttendanceToday
  trend: TrendPoint[]
}

const R = 52
const C = 2 * Math.PI * R

function rateColor(rate: number): string {
  if (rate >= 85) return '#168a66'
  if (rate >= 60) return '#d6991f'
  return '#dc2626'
}

/** Latest-day attendance gauge + 7-day rate mini chart. */
export default function AttendanceCard({ today, trend }: Props) {
  const rate = Math.max(0, Math.min(100, today.rate))
  const color = rateColor(rate)
  const dash = (rate / 100) * C
  const maxRate = Math.max(1, ...trend.map((p) => p.rate ?? 0))
  const dateLabel = today.date
    ? new Date(today.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : '—'

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[1.02rem] font-bold text-ink">Attendance</h3>
          <p className="text-[0.78rem] text-ink/50">Latest marked day · {dateLabel}</p>
        </div>
        <Link
          to="/admin/attendance"
          className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[0.78rem] font-semibold text-accent transition hover:bg-accent/10"
        >
          Open
          <ChevronRightIcon width={15} height={15} />
        </Link>
      </div>

      {today.total === 0 ? (
        <p className="py-12 text-center text-sm text-ink/40">No attendance marked yet.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div className="relative shrink-0">
              <svg width="132" height="132" viewBox="0 0 132 132">
                <circle cx="66" cy="66" r={R} fill="none" stroke="#f3e9d6" strokeWidth="13" />
                <circle
                  cx="66"
                  cy="66"
                  r={R}
                  fill="none"
                  stroke={color}
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={C / 4}
                  transform="rotate(-90 66 66)"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 grid place-content-center text-center">
                <span className="text-[1.6rem] font-extrabold leading-none" style={{ color }}>
                  {rate}%
                </span>
                <span className="text-[0.64rem] uppercase tracking-wider text-ink/45">Present</span>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <Pill label="Present" value={today.present} color="#168a66" />
              <Pill label="Absent" value={today.absent} color="#dc2626" />
              <Pill label="Late" value={today.late} color="#d6991f" />
              <Pill label="Excused" value={today.excused} color="#131c3d" />
            </div>
          </div>

          {/* 7-day rate mini bars */}
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-[0.74rem] font-semibold uppercase tracking-wider text-ink/40">Last 7 days</p>
            <div className="flex items-end gap-1.5" style={{ height: 64 }}>
              {trend.map((p) => {
                const r = p.rate ?? 0
                const h = Math.round((r / maxRate) * 100)
                return (
                  <div key={p.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-md transition-all duration-500"
                        style={{ height: `${Math.max(h, r > 0 ? 8 : 2)}%`, background: r > 0 ? rateColor(r) : 'rgba(19,28,61,0.1)' }}
                        title={`${p.label}: ${r}%`}
                      />
                    </div>
                    <span className="text-[0.66rem] text-ink/40">{p.label[0]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Pill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="text-[0.82rem] text-ink/55">{label}</span>
      <span className="ml-auto text-[0.88rem] font-bold text-ink">{value}</span>
    </div>
  )
}

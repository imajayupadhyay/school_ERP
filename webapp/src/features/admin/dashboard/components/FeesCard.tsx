import { Link } from 'react-router-dom'
import { formatINR } from '@/features/admin/fees/format'
import { ChevronRightIcon } from '../../components/icons'
import type { FeeStatusBreakdown, FeeSummary } from '../types'

interface Props {
  fees: FeeSummary
  status: FeeStatusBreakdown
}

const R = 52
const C = 2 * Math.PI * R

const STATUS_ROWS: { key: keyof FeeStatusBreakdown; label: string; color: string }[] = [
  { key: 'paid', label: 'Paid', color: '#168a66' },
  { key: 'partial', label: 'Partial', color: '#d6991f' },
  { key: 'pending', label: 'Pending', color: '#131c3d' },
  { key: 'overdue', label: 'Overdue', color: '#dc2626' },
]

/** Fee collection overview: progress ring + figures + invoice status mix. */
export default function FeesCard({ fees, status }: Props) {
  const rate = Math.max(0, Math.min(100, fees.collection_rate))
  const dash = (rate / 100) * C
  const totalInvoices = STATUS_ROWS.reduce((sum, row) => sum + status[row.key], 0)

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[1.02rem] font-bold text-ink">Fee Collection</h3>
          <p className="text-[0.78rem] text-ink/50">Across all assigned plans</p>
        </div>
        <Link
          to="/admin/fees"
          className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[0.78rem] font-semibold text-accent transition hover:bg-accent/10"
        >
          Collections
          <ChevronRightIcon width={15} height={15} />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div className="relative shrink-0">
          <svg width="132" height="132" viewBox="0 0 132 132">
            <circle cx="66" cy="66" r={R} fill="none" stroke="#f3e9d6" strokeWidth="13" />
            <circle
              cx="66"
              cy="66"
              r={R}
              fill="none"
              stroke="#ee6a2c"
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={C / 4}
              transform="rotate(-90 66 66)"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-[1.6rem] font-extrabold leading-none text-accent">{rate}%</span>
            <span className="text-[0.64rem] uppercase tracking-wider text-ink/45">Collected</span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          <Figure label="Billed" value={formatINR(fees.billed)} tone="text-ink" />
          <Figure label="Collected" value={formatINR(fees.collected)} tone="text-[#168a66]" />
          <Figure label="Outstanding" value={formatINR(fees.outstanding)} tone="text-ink" />
          <Figure label="Overdue" value={formatINR(fees.overdue)} tone="text-[#dc2626]" />
        </div>
      </div>

      {/* Invoice status mix */}
      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between text-[0.74rem] font-semibold uppercase tracking-wider text-ink/40">
          <span>Invoice status</span>
          <span>{totalInvoices} total</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-ink/[0.06]">
          {totalInvoices > 0 &&
            STATUS_ROWS.map((row) =>
              status[row.key] > 0 ? (
                <div
                  key={row.key}
                  style={{ width: `${(status[row.key] / totalInvoices) * 100}%`, background: row.color }}
                  title={`${row.label}: ${status[row.key]}`}
                />
              ) : null,
            )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {STATUS_ROWS.map((row) => (
            <div key={row.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
              <span className="text-[0.78rem] text-ink/55">{row.label}</span>
              <span className="ml-auto text-[0.8rem] font-bold text-ink">{status[row.key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Figure({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[0.82rem] text-ink/55">{label}</span>
      <span className={`text-[0.92rem] font-bold tabular-nums ${tone}`}>{value}</span>
    </div>
  )
}

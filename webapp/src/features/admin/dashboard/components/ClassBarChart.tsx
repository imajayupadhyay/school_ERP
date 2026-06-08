import type { ClassCount } from '../types'

interface Props {
  data: ClassCount[]
}

/** Lightweight CSS bar chart — students per class. No chart library needed. */
export default function ClassBarChart({ data }: Props) {
  const max = Math.max(1, ...data.map((d) => d.count))

  return (
    <div className="rounded-2xl border border-line bg-white p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[1.02rem] font-bold text-ink">Students by Class</h3>
          <p className="text-[0.78rem] text-ink/50">Enrolment distribution across grades</p>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink/40">No class data yet.</p>
      ) : (
        <div className="mt-6 flex items-end gap-2 sm:gap-3" style={{ height: 210 }}>
          {data.map((d) => {
            const h = Math.round((d.count / max) * 100)
            return (
              <div key={d.class_name} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[0.72rem] font-semibold text-ink/70">{d.count}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-accent to-accent-2 transition-all duration-500 hover:opacity-90"
                    style={{ height: `${h}%`, minHeight: 6 }}
                    title={`${d.class_name}: ${d.count}`}
                  />
                </div>
                <span className="text-[0.68rem] text-ink/45 text-center leading-tight">
                  {d.class_name.replace('Grade ', 'G')}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

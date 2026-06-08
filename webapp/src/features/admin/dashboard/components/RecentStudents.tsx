import type { RecentStudent } from '../types'

interface Props {
  students: RecentStudent[]
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-accent/12 text-accent',
    inactive: 'bg-ink/8 text-ink/55',
    alumni: 'bg-lime/15 text-[#b45309]',
  }
  const cls = map[status] ?? 'bg-ink/8 text-ink/55'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold capitalize ${cls}`}>
      {status}
    </span>
  )
}

export default function RecentStudents({ students }: Props) {
  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between px-5 py-4 md:px-6">
        <div>
          <h3 className="text-[1.02rem] font-bold text-ink">Recent Admissions</h3>
          <p className="text-[0.78rem] text-ink/50">Latest students added to your school</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[0.85rem]">
          <thead>
            <tr className="border-y border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
              <th className="px-5 py-3 font-semibold md:px-6">Student</th>
              <th className="px-4 py-3 font-semibold">Adm. No</th>
              <th className="px-4 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold">Admitted</th>
              <th className="px-5 py-3 font-semibold md:px-6">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-ink/40">
                  No students yet.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="border-b border-line/60 last:border-0 hover:bg-paper/50">
                  <td className="px-5 py-3 md:px-6">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink/8 text-[0.72rem] font-bold text-ink/70">
                        {s.name
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                      <span className="font-medium text-ink">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/65">{s.admission_no ?? '—'}</td>
                  <td className="px-4 py-3 text-ink/65">
                    {s.class_name ?? '—'}
                    {s.section ? ` · ${s.section}` : ''}
                  </td>
                  <td className="px-4 py-3 text-ink/55">{s.admission_date ?? '—'}</td>
                  <td className="px-5 py-3 md:px-6">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

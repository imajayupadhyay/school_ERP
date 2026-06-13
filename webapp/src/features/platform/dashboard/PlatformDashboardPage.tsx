import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/features/admin/components/PageHeader'
import { TableSkeleton, TableErrorState } from '@/features/admin/components/TableUI'
import StatCard from '@/features/admin/dashboard/components/StatCard'
import TrendChart from '@/features/admin/dashboard/components/TrendChart'
import {
  DashboardIcon,
  ClassesIcon,
  StudentsIcon,
  TeachersIcon,
  UsersGroupIcon,
} from '@/features/admin/components/icons'
import { usePlatformAuth } from '../auth/PlatformAuthContext'
import { fetchPlatformDashboard } from './api'
import type { PlatformSchoolSummary } from './types'

const PLATFORM_ACCENT = '#5145cd'

const STATUS_TONES: Record<string, string> = {
  active: 'bg-[#168a66]/12 text-[#168a66]',
  inactive: 'bg-ink/10 text-ink/55',
  suspended: 'bg-[#dc2626]/12 text-[#dc2626]',
  pending: 'bg-lime/15 text-[#b45309]',
}

function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONES[status.toLowerCase()] ?? 'bg-ink/10 text-ink/55'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.7rem] font-bold capitalize ${tone}`}>
      {status}
    </span>
  )
}

export default function PlatformDashboardPage() {
  const { user } = usePlatformAuth()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: fetchPlatformDashboard,
  })

  const firstName = (user?.name ?? 'Admin').split(' ')[0]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={DashboardIcon}
        title={`Welcome back, ${firstName}`}
        description="Platform-wide overview across every SchoolLID tenant."
        aside={
          data && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1 text-[0.78rem] font-semibold text-paper ring-1 ring-paper/15">
              <span className="text-lime">{data.totals.schools}</span> schools ·{' '}
              <span className="text-lime">{data.totals.students.toLocaleString()}</span> students
            </span>
          )
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError || !data ? (
        <TableErrorState onRetry={() => refetch()} />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Schools"
              value={data.totals.schools}
              icon={ClassesIcon}
              sublabel={`${data.totals.active_schools} active · ${data.totals.inactive_schools} inactive`}
              tone="bg-accent/12 text-accent"
            />
            <StatCard
              label="Total Students"
              value={data.totals.students.toLocaleString()}
              icon={StudentsIcon}
              sublabel="Across all tenants"
              tone="bg-[#2c49a6]/12 text-[#2c49a6]"
            />
            <StatCard
              label="Staff & Teachers"
              value={data.totals.employees.toLocaleString()}
              icon={TeachersIcon}
              sublabel="All schools"
              tone="bg-[#168a66]/12 text-[#168a66]"
            />
            <StatCard
              label="Platform Users"
              value={data.totals.users.toLocaleString()}
              icon={UsersGroupIcon}
              sublabel={`${data.totals.guardians.toLocaleString()} guardians`}
              tone="bg-lime/15 text-[#b45309]"
            />
          </div>

          {/* Growth + status breakdown */}
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <TrendChart
                title="School onboarding"
                subtitle="New schools per month (last 6 months)"
                points={data.growth_trend}
                color={PLATFORM_ACCENT}
                headline={`+${data.totals.new_schools_this_month} this month`}
              />
            </div>

            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <h3 className="text-[0.95rem] font-bold text-ink">Schools by status</h3>
              <p className="mt-0.5 text-[0.78rem] text-ink/45">Current tenant distribution</p>
              <ul className="mt-5 space-y-3">
                {Object.entries(data.schools_by_status).length === 0 && (
                  <li className="text-[0.85rem] text-ink/45">No schools yet.</li>
                )}
                {Object.entries(data.schools_by_status).map(([status, count]) => {
                  const pct = data.totals.schools > 0 ? Math.round((count / data.totals.schools) * 100) : 0
                  return (
                    <li key={status}>
                      <div className="mb-1 flex items-center justify-between text-[0.82rem]">
                        <StatusPill status={status} />
                        <span className="font-semibold text-ink/70 tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Recent + top schools */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SchoolList
              title="Recently onboarded"
              subtitle="Newest tenants on the platform"
              schools={data.recent_schools}
              showDate
            />
            <SchoolList
              title="Largest schools"
              subtitle="By enrolled students"
              schools={data.top_schools}
            />
          </div>
        </>
      )}
    </div>
  )
}

function SchoolList({
  title,
  subtitle,
  schools,
  showDate,
}: {
  title: string
  subtitle: string
  schools: PlatformSchoolSummary[]
  showDate?: boolean
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h3 className="text-[0.95rem] font-bold text-ink">{title}</h3>
      <p className="mt-0.5 text-[0.78rem] text-ink/45">{subtitle}</p>

      {schools.length === 0 ? (
        <p className="mt-6 text-[0.85rem] text-ink/45">No schools yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line/60">
          {schools.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-paper-2 to-paper text-[0.78rem] font-bold text-ink/60 ring-1 ring-line">
                {s.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.88rem] font-semibold text-ink">{s.name}</p>
                <p className="mt-0.5 truncate text-[0.74rem] text-ink/45">
                  {s.code}
                  {s.city ? ` · ${s.city}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusPill status={s.status} />
                <span className="text-[0.74rem] font-medium text-ink/50 tabular-nums">
                  {showDate && s.created_at
                    ? new Date(s.created_at).toLocaleDateString()
                    : `${s.students_count.toLocaleString()} students`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

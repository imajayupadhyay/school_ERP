import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { formatINR } from '@/features/admin/fees/format'
import { fetchDashboard } from './api'
import StatCard from './components/StatCard'
import ClassBarChart from './components/ClassBarChart'
import GenderDonut from './components/GenderDonut'
import RecentStudents from './components/RecentStudents'
import FeesCard from './components/FeesCard'
import AttendanceCard from './components/AttendanceCard'
import TrendChart from './components/TrendChart'
import QuickActions from './components/QuickActions'
import { StudentsIcon, TeachersIcon, ClassesIcon, SectionsIcon } from '../components/icons'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  })

  const firstName = (user?.name ?? '').split(' ')[0] || 'there'
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (isLoading) return <DashboardSkeleton />

  if (isError || !data) {
    return (
      <div className="grid place-items-center rounded-2xl border border-line bg-white py-20 text-center shadow-sm">
        <p className="font-semibold text-ink/75">We couldn’t load your dashboard.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
        >
          Try again
        </button>
      </div>
    )
  }

  const {
    stats,
    fees,
    fee_status,
    collection_trend,
    attendance_today,
    attendance_trend,
    admissions_trend,
    students_by_class,
    students_by_gender,
    recent_students,
    school,
  } = data

  const collectionHeadline = formatINR(collection_trend.reduce((sum, p) => sum + (p.amount ?? 0), 0))
  const admissionsHeadline = `${admissions_trend.reduce((sum, p) => sum + (p.count ?? 0), 0)} joined`

  return (
    <div className="space-y-6">
      {/* Greeting band */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ink to-ink-soft px-6 py-6 text-paper shadow-[0_18px_40px_-24px_rgba(19,28,61,.55)]">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-accent/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-lime/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[0.8rem] font-medium text-paper/55">{today}</p>
            <h1 className="mt-1 text-[1.7rem] font-extrabold leading-tight tracking-[-0.02em]">
              Welcome back, {firstName} 👋
            </h1>
            <p className="mt-1 text-[0.9rem] text-paper/65">
              Here’s what’s happening at <span className="font-semibold text-paper">{school.name}</span> today.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-paper/10 px-3.5 py-2 text-[0.78rem] font-medium text-paper/85 ring-1 ring-paper/15">
            <span className="h-2 w-2 rounded-full bg-lime" />
            School Code · <span className="font-bold text-paper">{school.code}</span>
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={stats.students_total}
          icon={StudentsIcon}
          sublabel={`${stats.students_active} active`}
          tone="bg-accent/12 text-accent"
        />
        <StatCard
          label="Teachers & Staff"
          value={stats.staff_total}
          icon={TeachersIcon}
          sublabel={`${stats.teachers_total} teachers`}
          tone="bg-[#2c49a6]/12 text-[#2c49a6]"
        />
        <StatCard
          label="Classes"
          value={stats.classes_total}
          icon={ClassesIcon}
          sublabel="Grades running"
          tone="bg-lime/20 text-[#b45309]"
        />
        <StatCard
          label="Sections"
          value={stats.sections_total}
          icon={SectionsIcon}
          sublabel="Across all classes"
          tone="bg-[#168a66]/12 text-[#168a66]"
        />
      </div>

      {/* Fees + Attendance */}
      <div className="grid gap-4 xl:grid-cols-2">
        <FeesCard fees={fees} status={fee_status} />
        <AttendanceCard today={attendance_today} trend={attendance_trend} />
      </div>

      {/* Trends */}
      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChart
          title="Fee Collection Trend"
          subtitle="Payments received over the last 6 months"
          points={collection_trend.map((p) => ({ label: p.label, value: p.amount ?? 0 }))}
          color="#ee6a2c"
          format={formatINR}
          headline={collectionHeadline}
        />
        <TrendChart
          title="Admissions Trend"
          subtitle="New students over the last 6 months"
          points={admissions_trend.map((p) => ({ label: p.label, value: p.count ?? 0 }))}
          color="#2c49a6"
          format={(v) => `${v}`}
          headline={admissionsHeadline}
        />
      </div>

      {/* Enrolment distribution */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ClassBarChart data={students_by_class} />
        <GenderDonut data={students_by_gender} />
      </div>

      {/* Recent admissions + quick actions */}
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <RecentStudents students={recent_students} />
        <QuickActions />
      </div>

      {isFetching && <p className="text-center text-[0.75rem] text-ink/35">Refreshing…</p>}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-[132px] animate-pulse rounded-2xl bg-ink/[0.06]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[148px] animate-pulse rounded-2xl bg-ink/[0.05]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-[320px] animate-pulse rounded-2xl bg-ink/[0.05]" />
        <div className="h-[320px] animate-pulse rounded-2xl bg-ink/[0.05]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-[280px] animate-pulse rounded-2xl bg-ink/[0.05]" />
        <div className="h-[280px] animate-pulse rounded-2xl bg-ink/[0.05]" />
      </div>
      <div className="h-[300px] animate-pulse rounded-2xl bg-ink/[0.05]" />
    </div>
  )
}

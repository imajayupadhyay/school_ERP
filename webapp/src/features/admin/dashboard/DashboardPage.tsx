import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchDashboard } from './api'
import StatCard from './components/StatCard'
import ClassBarChart from './components/ClassBarChart'
import GenderDonut from './components/GenderDonut'
import RecentStudents from './components/RecentStudents'
import {
  StudentsIcon,
  TeachersIcon,
  ClassesIcon,
  SectionsIcon,
} from '../components/icons'

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
      <div className="grid place-items-center rounded-2xl border border-line bg-white py-20 text-center">
        <p className="text-ink/70">We couldn't load your dashboard.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
        >
          Try again
        </button>
      </div>
    )
  }

  const { stats, students_by_class, students_by_gender, recent_students, school } = data

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.8rem] font-medium text-ink/45">{today}</p>
          <h1 className="mt-1 text-[1.7rem] font-extrabold tracking-[-0.02em] text-ink">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-1 text-[0.92rem] text-ink/55">
            Here's what's happening at{' '}
            <span className="font-semibold text-ink/75">{school.name}</span> today.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-[0.78rem] font-medium text-ink/60">
          <span className="h-2 w-2 rounded-full bg-accent" />
          School Code · <span className="font-semibold text-ink">{school.code}</span>
        </span>
      </div>

      {/* Stat cards */}
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
          tone="bg-ink/8 text-ink"
        />
        <StatCard
          label="Classes"
          value={stats.classes_total}
          icon={ClassesIcon}
          sublabel="Grades running"
          tone="bg-lime/15 text-[#b45309]"
        />
        <StatCard
          label="Sections"
          value={stats.sections_total}
          icon={SectionsIcon}
          sublabel="Across all classes"
          tone="bg-accent-2/15 text-accent"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ClassBarChart data={students_by_class} />
        <GenderDonut data={students_by_gender} />
      </div>

      {/* Recent admissions */}
      <RecentStudents students={recent_students} />

      {isFetching && (
        <p className="text-center text-[0.75rem] text-ink/35">Refreshing…</p>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-16 w-72 rounded-xl bg-ink/5" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[148px] rounded-2xl bg-ink/5" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="h-[300px] rounded-2xl bg-ink/5" />
        <div className="h-[300px] rounded-2xl bg-ink/5" />
      </div>
      <div className="h-[280px] rounded-2xl bg-ink/5" />
    </div>
  )
}

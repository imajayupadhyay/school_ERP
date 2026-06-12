import { Link } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import {
  AttendanceIcon,
  FeesIcon,
  NoticesIcon,
  PlusIcon,
  StudentsIcon,
  TeachersIcon,
} from '../../components/icons'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

const ACTIONS: { to: string; label: string; icon: Icon; tone: string }[] = [
  { to: '/admin/students', label: 'Add Student', icon: StudentsIcon, tone: 'bg-accent/12 text-accent' },
  { to: '/admin/fees', label: 'Collect Fees', icon: FeesIcon, tone: 'bg-[#168a66]/12 text-[#168a66]' },
  { to: '/admin/attendance', label: 'Mark Attendance', icon: AttendanceIcon, tone: 'bg-[#2c49a6]/12 text-[#2c49a6]' },
  { to: '/admin/notices', label: 'Post Notice', icon: NoticesIcon, tone: 'bg-lime/20 text-[#b45309]' },
  { to: '/admin/employees', label: 'Add Staff', icon: TeachersIcon, tone: 'bg-ink/8 text-ink' },
  { to: '/admin/exams', label: 'Exams', icon: PlusIcon, tone: 'bg-[#d6991f]/15 text-[#b45309]' },
]

/** Shortcut grid into the most common admin workflows. */
export default function QuickActions() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-6">
      <h3 className="text-[1.02rem] font-bold text-ink">Quick Actions</h3>
      <p className="text-[0.78rem] text-ink/50">Jump straight into a workflow</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.to + action.label}
              to={action.to}
              className="group flex items-center gap-3 rounded-xl border border-line bg-paper/40 px-3 py-3 transition hover:border-accent/40 hover:bg-white hover:shadow-[0_10px_24px_-16px_rgba(19,28,61,.5)]"
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${action.tone}`}>
                <Icon width={18} height={18} />
              </span>
              <span className="text-[0.82rem] font-semibold text-ink/75 transition group-hover:text-ink">
                {action.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

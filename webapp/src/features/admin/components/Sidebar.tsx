import { NavLink } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import {
  DashboardIcon,
  StudentsIcon,
  ParentsIcon,
  TeachersIcon,
  ClassesIcon,
  AttendanceIcon,
  FeesIcon,
  ExamsIcon,
  NoticesIcon,
  SettingsIcon,
  CloseIcon,
} from './icons'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

interface NavItem {
  label: string
  icon: Icon
  to?: string // present => navigable; absent => not built yet
}

const primaryNav: NavItem[] = [
  { label: 'Dashboard', icon: DashboardIcon, to: '/admin' },
  { label: 'Students', icon: StudentsIcon, to: '/admin/students' },
  { label: 'Parents & Guardians', icon: ParentsIcon, to: '/admin/guardians' },
  { label: 'Teachers & Staff', icon: TeachersIcon, to: '/admin/employees' },
  { label: 'Classes', icon: ClassesIcon, to: '/admin/academic-setup' },
  { label: 'Attendance', icon: AttendanceIcon, to: '/admin/attendance' },
  { label: 'Fees', icon: FeesIcon, to: '/admin/fees' },
  { label: 'Exams & Results', icon: ExamsIcon },
  { label: 'Notices', icon: NoticesIcon },
]

const secondaryNav: NavItem[] = [{ label: 'Settings', icon: SettingsIcon, to: '/admin/settings' }]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-ink text-paper transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-[68px] border-b border-paper/10">
          <img src="/brand/schoollid-logo-full.png" alt="SchoolLID" className="h-8 w-auto" />
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-paper/70 hover:bg-paper/10"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-paper/35">
            Main
          </p>
          <ul className="space-y-1">
            {primaryNav.map((item) => (
              <li key={item.label}>
                <NavItemLink item={item} onNavigate={onClose} />
              </li>
            ))}
          </ul>

          <p className="px-3 pt-6 pb-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-paper/35">
            System
          </p>
          <ul className="space-y-1">
            {secondaryNav.map((item) => (
              <li key={item.label}>
                <NavItemLink item={item} onNavigate={onClose} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-5 py-4 border-t border-paper/10 text-[0.72rem] text-paper/45">
          SchoolLID · v0.1
        </div>
      </aside>
    </>
  )
}

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const Icon = item.icon

  // Modules without a route yet are shown but disabled with a "Soon" tag.
  if (!item.to) {
    return (
      <span
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium text-paper/40 cursor-not-allowed select-none"
        title="Coming soon"
      >
        <Icon className="shrink-0 opacity-70" width={19} height={19} />
        <span className="flex-1">{item.label}</span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-lime/80 bg-lime/10 rounded-full px-2 py-0.5">
          Soon
        </span>
      </span>
    )
  }

  return (
    <NavLink
      to={item.to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium transition ${
          isActive
            ? 'bg-accent text-white shadow-[0_8px_20px_rgba(238,106,44,.35)]'
            : 'text-paper/75 hover:bg-paper/10 hover:text-paper'
        }`
      }
    >
      <Icon className="shrink-0" width={19} height={19} />
      <span className="flex-1">{item.label}</span>
    </NavLink>
  )
}

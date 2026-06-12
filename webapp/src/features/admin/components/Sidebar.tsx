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
  HomeworkIcon,
  NoticesIcon,
  ReportsIcon,
  SettingsIcon,
  CloseIcon,
  ChevronsLeftIcon,
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
  { label: 'Exams & Results', icon: ExamsIcon, to: '/admin/exams' },
  { label: 'Homework & Materials', icon: HomeworkIcon, to: '/admin/learning' },
  { label: 'Notices', icon: NoticesIcon, to: '/admin/notices' },
  { label: 'Reports & Audit Logs', icon: ReportsIcon, to: '/admin/reports' },
]

const secondaryNav: NavItem[] = [{ label: 'Settings', icon: SettingsIcon, to: '/admin/settings' }]

interface SidebarProps {
  /** Desktop icon-rail mode (lg+). */
  collapsed: boolean
  /** Mobile slide-over open. */
  mobileOpen: boolean
  onCloseMobile: () => void
  onToggleCollapse: () => void
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}

      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-ink text-paper transition-[width,transform] duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'}`}
      >
        {/* Brand */}
        <div
          className={`flex h-[68px] items-center border-b border-paper/10 px-5 ${
            collapsed ? 'lg:justify-center lg:px-0' : 'justify-between'
          }`}
        >
          <img
            src="/brand/schoollid-logo-full.png"
            alt="SchoolLID"
            className={`h-8 w-auto ${collapsed ? 'lg:hidden' : ''}`}
          />
          <img
            src="/brand/schoollid-mark.png"
            alt="SchoolLID"
            className={`hidden h-8 w-auto ${collapsed ? 'lg:block' : ''}`}
          />
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-paper/70 hover:bg-paper/10 lg:hidden"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <GroupLabel collapsed={collapsed}>Main</GroupLabel>
          <ul className="space-y-1">
            {primaryNav.map((item) => (
              <li key={item.label}>
                <NavItemLink item={item} collapsed={collapsed} onNavigate={onCloseMobile} />
              </li>
            ))}
          </ul>

          <GroupLabel collapsed={collapsed} className="pt-6">
            System
          </GroupLabel>
          <ul className="space-y-1">
            {secondaryNav.map((item) => (
              <li key={item.label}>
                <NavItemLink item={item} collapsed={collapsed} onNavigate={onCloseMobile} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="border-t border-paper/10 p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.82rem] font-medium text-paper/60 transition hover:bg-paper/10 hover:text-paper lg:flex ${
              collapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <ChevronsLeftIcon
              width={18}
              height={18}
              className={`shrink-0 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            />
            {!collapsed && <span className="flex-1 text-left">Collapse</span>}
          </button>

          {/* Footer caption — hidden in the desktop rail, shown on mobile drawer */}
          <p
            className={`px-3 pt-1 text-[0.72rem] text-paper/40 ${collapsed ? 'lg:hidden' : ''}`}
          >
            SchoolLID · v0.1
          </p>
        </div>
      </aside>
    </>
  )
}

function GroupLabel({
  collapsed,
  className = '',
  children,
}: {
  collapsed: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <p
      className={`px-3 pb-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-paper/35 ${
        collapsed ? 'lg:hidden' : ''
      } ${className}`}
    >
      {children}
    </p>
  )
}

function NavItemLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate: () => void
}) {
  const Icon = item.icon
  const railClasses = collapsed ? 'lg:justify-center lg:px-0' : ''

  // Modules without a route yet are shown but disabled with a "Soon" tag.
  if (!item.to) {
    return (
      <span
        title={item.label}
        className={`flex cursor-not-allowed select-none items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium text-paper/40 ${railClasses}`}
      >
        <Icon className="shrink-0 opacity-70" width={19} height={19} />
        <span className={`flex-1 ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
        <span
          className={`rounded-full bg-lime/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-lime/80 ${
            collapsed ? 'lg:hidden' : ''
          }`}
        >
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
      title={item.label}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium transition ${railClasses} ${
          isActive
            ? 'bg-accent text-white shadow-[0_8px_20px_rgba(238,106,44,.35)]'
            : 'text-paper/75 hover:bg-paper/10 hover:text-paper'
        }`
      }
    >
      <Icon className="shrink-0" width={19} height={19} />
      <span className={`flex-1 ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
    </NavLink>
  )
}

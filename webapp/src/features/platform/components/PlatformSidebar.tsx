import { NavLink } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import {
  DashboardIcon,
  ClassesIcon,
  GraduationIcon,
  TagIcon,
  LayersIcon,
  ReceiptIcon,
  ShieldIcon,
  UsersGroupIcon,
  NoticesIcon,
  SettingsIcon,
  ReportsIcon,
  CloseIcon,
  ChevronsLeftIcon,
} from '@/features/admin/components/icons'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

interface NavItem {
  label: string
  icon: Icon
  to?: string // present => navigable; absent => not built yet ("Soon")
}

interface NavGroup {
  label: string
  items: NavItem[]
}

/** Platform Super Admin navigation — mirrors the Phase 4 build order. */
const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: DashboardIcon, to: '/platform' }],
  },
  {
    label: 'Tenants',
    items: [
      { label: 'Schools', icon: ClassesIcon },
      { label: 'Onboarding', icon: GraduationIcon },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'Subscription Plans', icon: TagIcon },
      { label: 'Subscriptions', icon: LayersIcon },
      { label: 'Invoices', icon: ReceiptIcon },
    ],
  },
  {
    label: 'Access',
    items: [
      { label: 'Module Access', icon: ShieldIcon },
      { label: 'Platform Users', icon: UsersGroupIcon },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Support Tickets', icon: NoticesIcon },
      { label: 'Announcements', icon: NoticesIcon },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Gateways', icon: SettingsIcon },
      { label: 'Reports & Audit', icon: ReportsIcon },
    ],
  },
]

interface PlatformSidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
  onToggleCollapse: () => void
}

export default function PlatformSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: PlatformSidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}

      <aside
        className={`platform-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col text-paper transition-[width,transform] duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'}`}
      >
        {/* Brand */}
        <div
          className={`flex h-[68px] items-center border-b border-paper/10 px-5 ${
            collapsed ? 'lg:justify-center lg:px-0' : 'justify-between'
          }`}
        >
          <span className={`flex items-center gap-2.5 ${collapsed ? 'lg:hidden' : ''}`}>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white text-[0.8rem] font-black">S</span>
            <span className="text-[0.95rem] font-extrabold tracking-tight">
              SchoolLID <span className="font-light text-paper/55">Platform</span>
            </span>
          </span>
          <span className={`hidden h-8 w-8 place-items-center rounded-lg bg-accent text-white text-[0.8rem] font-black ${collapsed ? 'lg:grid' : ''}`}>
            S
          </span>
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
          {navGroups.map((group, index) => (
            <div key={group.label} className={index > 0 ? 'pt-6' : ''}>
              <GroupLabel collapsed={collapsed}>{group.label}</GroupLabel>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <NavItemLink item={item} collapsed={collapsed} onNavigate={onCloseMobile} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
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
          <p className={`px-3 pt-1 text-[0.72rem] text-paper/40 ${collapsed ? 'lg:hidden' : ''}`}>
            Platform Console · v0.1
          </p>
        </div>
      </aside>
    </>
  )
}

function GroupLabel({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  return (
    <p
      className={`px-3 pb-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-paper/35 ${
        collapsed ? 'lg:hidden' : ''
      }`}
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
            ? 'bg-accent text-white shadow-[0_8px_20px_rgba(81,69,205,.4)]'
            : 'text-paper/75 hover:bg-paper/10 hover:text-paper'
        }`
      }
    >
      <Icon className="shrink-0" width={19} height={19} />
      <span className={`flex-1 ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
    </NavLink>
  )
}

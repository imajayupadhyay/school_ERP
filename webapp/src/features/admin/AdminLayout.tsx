import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import './admin-theme.css'

const COLLAPSE_KEY = 'admin.sidebar.collapsed'

/** Shell for the School Admin panel: collapsible sidebar + sticky topbar + workspace. */
export default function AdminLayout() {
  // Desktop drawer collapse (icon rail). Persisted so it survives reloads.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(COLLAPSE_KEY) === '1'
  })
  // Mobile slide-over drawer.
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), [])

  return (
    <div className="admin-theme min-h-screen bg-paper">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapsed}
      />

      {/* Content shifts to make room for the sidebar on lg+, and reclaims the
          full width when the rail is collapsed. Transition keeps it smooth. */}
      <div
        className={`transition-[padding] duration-300 ease-in-out ${
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'
        }`}
      >
        <Topbar
          collapsed={collapsed}
          onOpenMenu={() => setMobileOpen(true)}
          onToggleCollapse={toggleCollapsed}
        />
        <main className="px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

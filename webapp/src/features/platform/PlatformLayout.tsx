import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import PlatformSidebar from './components/PlatformSidebar'
import PlatformTopbar from './components/PlatformTopbar'
import './platform-theme.css'

const COLLAPSE_KEY = 'platform.sidebar.collapsed'

/** Shell for the Platform Super Admin panel: collapsible sidebar + topbar + workspace. */
export default function PlatformLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(COLLAPSE_KEY) === '1'
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), [])

  return (
    <div className="platform-theme min-h-screen bg-paper">
      <PlatformSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapsed}
      />

      <div
        className={`transition-[padding] duration-300 ease-in-out ${
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'
        }`}
      >
        <PlatformTopbar
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

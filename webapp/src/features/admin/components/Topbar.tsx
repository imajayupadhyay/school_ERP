import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { BellIcon, ChevronDownIcon, LogoutIcon, MenuIcon, PanelLeftIcon, SearchIcon } from './icons'

interface TopbarProps {
  collapsed: boolean
  onOpenMenu: () => void
  onToggleCollapse: () => void
}

export default function Topbar({ collapsed, onOpenMenu, onToggleCollapse }: TopbarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const onSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur-md md:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="lg:hidden p-2 rounded-lg text-ink/70 hover:bg-paper-2"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      {/* Desktop collapse toggle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="hidden rounded-lg p-2 text-ink/70 transition hover:bg-paper-2 lg:block"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={collapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <PanelLeftIcon />
      </button>

      {/* Search */}
      <div className="relative hidden sm:block w-full max-w-sm">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35">
          <SearchIcon width={18} height={18} />
        </span>
        <input
          type="search"
          placeholder="Search students, staff, classes…"
          className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-3 text-[0.88rem] text-ink outline-none transition placeholder:text-ink/35 focus:border-accent focus:shadow-[0_0_0_3px_rgba(238,106,44,.14)]"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <button
          type="button"
          className="relative grid h-10 w-10 place-items-center rounded-xl text-ink/65 hover:bg-paper-2"
          aria-label="Notifications"
        >
          <BellIcon />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-paper" />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 transition hover:bg-paper-2"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-[0.8rem] font-bold text-paper">
              {initials}
            </span>
            <span className="hidden text-left md:block">
              <span className="block text-[0.84rem] font-semibold leading-tight text-ink">
                {user?.name}
              </span>
              <span className="block text-[0.72rem] capitalize leading-tight text-ink/50">
                {user?.role?.replace('_', ' ')}
              </span>
            </span>
            <ChevronDownIcon width={16} height={16} className="text-ink/40" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white shadow-[0_18px_40px_rgba(19,28,61,.18)]">
              <div className="border-b border-line px-4 py-3">
                <p className="truncate text-[0.85rem] font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-[0.75rem] text-ink/55">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[0.85rem] font-medium text-[#b91c1c] transition hover:bg-[#e11d48]/[0.06]"
              >
                <LogoutIcon width={18} height={18} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

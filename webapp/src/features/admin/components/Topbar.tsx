import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import GlobalSearch from './GlobalSearch'
import { BellIcon, ChevronDownIcon, LogoutIcon, MenuIcon, PanelLeftIcon } from './icons'

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
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-2 border-b border-line bg-paper/80 px-4 backdrop-blur-xl md:gap-3 md:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="rounded-lg p-2 text-ink/70 transition hover:bg-paper-2 lg:hidden"
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

      {/* Global search (sm and up) */}
      <div className="hidden flex-1 sm:flex">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2.5">
        <button
          type="button"
          className="relative grid h-10 w-10 place-items-center rounded-xl text-ink/65 transition hover:bg-paper-2 hover:text-ink"
          aria-label="Notifications"
        >
          <BellIcon />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-paper" />
        </button>

        <span className="hidden h-8 w-px bg-line md:block" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={`flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 transition hover:bg-paper-2 ${
              menuOpen ? 'bg-paper-2' : ''
            }`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-ink to-ink-soft text-[0.8rem] font-bold text-paper shadow-sm ring-1 ring-white/10">
              {initials}
            </span>
            <span className="hidden text-left md:block">
              <span className="block max-w-[10rem] truncate text-[0.84rem] font-semibold leading-tight text-ink">
                {user?.name}
              </span>
              <span className="block text-[0.72rem] capitalize leading-tight text-ink/50">
                {user?.role?.replaceAll('_', ' ')}
              </span>
            </span>
            <ChevronDownIcon
              width={16}
              height={16}
              className={`text-ink/40 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-white shadow-[0_18px_40px_rgba(19,28,61,.18)]">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ink to-ink-soft text-[0.82rem] font-bold text-paper">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[0.85rem] font-semibold text-ink">{user?.name}</p>
                  <p className="truncate text-[0.75rem] text-ink/55">{user?.email}</p>
                </div>
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

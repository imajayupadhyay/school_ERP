import { useEffect, useRef, useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BellIcon,
  CalendarIcon,
  ClassesIcon,
  ExamsIcon,
  FeesIcon,
  HomeworkIcon,
  NoticesIcon,
  ParentsIcon,
  StudentsIcon,
  TeachersIcon,
} from '../components/icons'
import { fetchNotifications, fetchUnreadCount, markNotificationsSeen } from './api'
import type { AppNotification } from './types'

type IconCmp = ComponentType<SVGProps<SVGSVGElement> & { width?: number; height?: number }>

const CATEGORY: Record<string, { Icon: IconCmp; tint: string }> = {
  students: { Icon: StudentsIcon, tint: 'bg-[#2c49a6]/12 text-[#2c49a6]' },
  guardians: { Icon: ParentsIcon, tint: 'bg-[#7c3aed]/12 text-[#7c3aed]' },
  employees: { Icon: TeachersIcon, tint: 'bg-[#0e7490]/12 text-[#0e7490]' },
  fees: { Icon: FeesIcon, tint: 'bg-[#168a66]/12 text-[#168a66]' },
  exams: { Icon: ExamsIcon, tint: 'bg-lime/20 text-[#b45309]' },
  notices: { Icon: NoticesIcon, tint: 'bg-accent/12 text-accent' },
  learning: { Icon: HomeworkIcon, tint: 'bg-[#2c49a6]/12 text-[#2c49a6]' },
  timetables: { Icon: CalendarIcon, tint: 'bg-accent/12 text-accent' },
  academic: { Icon: ClassesIcon, tint: 'bg-[#0e7490]/12 text-[#0e7490]' },
}
const FALLBACK = { Icon: BellIcon, tint: 'bg-ink/[0.07] text-ink/55' }

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const seenFiredRef = useRef(false)

  // Badge: cheap unread count, polled every 30s and on window focus.
  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })

  // Full feed: only fetched while the dropdown is open.
  const { data: feed, isLoading } = useQuery({
    queryKey: ['notifications', 'feed'],
    queryFn: fetchNotifications,
    enabled: open,
  })

  const seenMutation = useMutation({
    mutationFn: markNotificationsSeen,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
  })

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Mark seen once the feed for this open session has loaded (keeps the unread
  // highlights visible for the current view, but clears the badge going forward).
  useEffect(() => {
    if (open && feed && !seenFiredRef.current) {
      seenFiredRef.current = true
      if (feed.unread_count > 0) seenMutation.mutate()
    }
    if (!open) seenFiredRef.current = false
  }, [open, feed, seenMutation])

  const openItem = (n: AppNotification) => {
    setOpen(false)
    navigate(n.route)
  }

  const badge = unread > 9 ? '9+' : String(unread)
  const items = feed?.items ?? []

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative grid h-10 w-10 place-items-center rounded-xl text-ink/65 transition hover:bg-paper-2 hover:text-ink ${
          open ? 'bg-paper-2 text-ink' : ''
        }`}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[0.62rem] font-bold leading-none text-white ring-2 ring-paper">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_40px_rgba(19,28,61,.18)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[0.9rem] font-bold text-ink">Notifications</p>
            {unread > 0 && (
              <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[0.7rem] font-bold text-accent">
                {unread} new
              </span>
            )}
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-paper-2" />
                    <span className="flex-1 space-y-1.5">
                      <span className="block h-3 w-2/3 animate-pulse rounded bg-paper-2" />
                      <span className="block h-2.5 w-1/3 animate-pulse rounded bg-paper-2" />
                    </span>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="grid place-items-center px-6 py-12 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <BellIcon width={26} height={26} />
                </span>
                <h4 className="mt-3 text-[0.92rem] font-bold text-ink">You're all caught up</h4>
                <p className="mt-1 text-[0.8rem] text-ink/50">
                  New activity across your school will show up here.
                </p>
              </div>
            ) : (
              <ul>
                {items.map((n) => {
                  const { Icon, tint } = CATEGORY[n.category] ?? FALLBACK
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openItem(n)}
                        className={`flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left transition last:border-0 hover:bg-accent/[0.04] ${
                          n.read ? '' : 'bg-accent/[0.03]'
                        }`}
                      >
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tint}`}>
                          <Icon width={18} height={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="line-clamp-1 text-[0.84rem] font-semibold text-ink">{n.title}</span>
                            {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                          </span>
                          <span className="mt-0.5 line-clamp-1 text-[0.76rem] text-ink/50">
                            {n.actor} · {timeAgo(n.created_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

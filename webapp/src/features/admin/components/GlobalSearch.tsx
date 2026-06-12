import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { globalSearch, type SearchGroup } from '../search/api'
import { ClassesIcon, ParentsIcon, SearchIcon, StudentsIcon, TeachersIcon } from './icons'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

const GROUP_ICON: Record<SearchGroup['type'], Icon> = {
  students: StudentsIcon,
  employees: TeachersIcon,
  guardians: ParentsIcon,
  classes: ClassesIcon,
}

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [rawActiveIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce the query feeding the request.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 250)
    return () => window.clearTimeout(id)
  }, [query])

  // ⌘K / Ctrl+K focuses the search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const enabled = debounced.length >= 2
  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => globalSearch(debounced),
    enabled,
    staleTime: 15_000,
  })

  const groups = useMemo(() => data?.groups ?? [], [data])
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])
  // Clamp during render so a shrinking result set never leaves a stale index.
  const activeIndex = Math.min(rawActiveIndex, Math.max(flat.length - 1, 0))

  const go = (url: string) => {
    setOpen(false)
    setQuery('')
    setDebounced('')
    inputRef.current?.blur()
    navigate(url)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!enabled) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const target = flat[activeIndex] ?? flat[0]
      if (target) go(target.url)
    }
  }

  const showPanel = open && enabled

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40">
        <SearchIcon width={18} height={18} />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search students, staff, parents, classes…"
        aria-label="Global search"
        className="w-full rounded-xl border border-line bg-white/70 py-2.5 pl-11 pr-16 text-[0.88rem] text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus:border-accent focus:bg-white focus:shadow-[0_0_0_3px_rgba(238,106,44,.14)]"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-line bg-paper-2/70 px-1.5 py-0.5 text-[0.66rem] font-semibold text-ink/45 md:flex">
        ⌘K
      </kbd>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-12px_rgba(19,28,61,.32)]">
          {isFetching && groups.length === 0 ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-paper-2" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-paper-2" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-paper-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : flat.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[0.88rem] font-semibold text-ink/70">No results</p>
              <p className="mt-0.5 text-[0.8rem] text-ink/45">
                Nothing matches “{debounced}”. Try a name, admission no., or staff code.
              </p>
            </div>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto py-2">
              {groups.map((group, groupIndex) => {
                const Icon = GROUP_ICON[group.type]
                // Flat index of this group's first item (for keyboard highlight).
                const base = groups.slice(0, groupIndex).reduce((n, g) => n + g.items.length, 0)
                return (
                  <div key={group.type} className="px-2 pb-1">
                    <p className="px-2 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-ink/40">
                      {group.label}
                    </p>
                    {group.items.map((item, itemIndex) => {
                      const idx = base + itemIndex
                      const active = idx === activeIndex
                      return (
                        <button
                          key={`${group.type}-${item.id}`}
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => go(item.url)}
                          className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                            active ? 'bg-accent/[0.08]' : 'hover:bg-paper-2/60'
                          }`}
                        >
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 transition ${
                              active ? 'bg-accent/15 text-accent ring-accent/25' : 'bg-paper-2/70 text-ink/55 ring-line'
                            }`}
                          >
                            <Icon width={17} height={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.86rem] font-semibold text-ink">{item.label}</span>
                            {item.sublabel && (
                              <span className="block truncate text-[0.76rem] text-ink/50">{item.sublabel}</span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
              <div className="mt-1 flex items-center justify-between border-t border-line px-4 py-2 text-[0.72rem] text-ink/40">
                <span><b className="text-ink/55">↑↓</b> to navigate · <b className="text-ink/55">↵</b> to open</span>
                <span><b className="text-ink/55">esc</b> to close</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

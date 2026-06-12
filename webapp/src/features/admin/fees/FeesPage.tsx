import { useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { FeesIcon, LayersIcon, TagIcon, UsersGroupIcon } from '../components/icons'
import CollectionsTab from './components/CollectionsTab'
import StructuresTab from './components/StructuresTab'
import FeeHeadsTab from './components/FeeHeadsTab'
import { fetchFeeHeads, fetchFeeStructures } from './api'

const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin']

type Icon = ComponentType<SVGProps<SVGSVGElement>>

const TABS: { key: TabKey; label: string; icon: Icon }[] = [
  { key: 'collections', label: 'Collections', icon: UsersGroupIcon },
  { key: 'structures', label: 'Fee Structures', icon: LayersIcon },
  { key: 'heads', label: 'Fee Heads', icon: TagIcon },
]

type TabKey = 'collections' | 'structures' | 'heads'

export default function FeesPage() {
  const { user } = useAuth()
  const canEdit = !!user && EDITOR_ROLES.includes(user.role)
  const [activeTab, setActiveTab] = useState<TabKey>('collections')

  // Cheap count badges (cache-shared with each tab's own query).
  const { data: structures } = useQuery({ queryKey: ['fee-structures', {}], queryFn: () => fetchFeeStructures() })
  const { data: heads } = useQuery({ queryKey: ['fee-heads'], queryFn: () => fetchFeeHeads() })

  const counts: Partial<Record<TabKey, number>> = {
    structures: structures?.length,
    heads: heads?.length,
  }

  return (
    <div className="space-y-6">
      {/* Header band */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ink to-ink-soft px-6 py-6 text-paper shadow-[0_18px_40px_-24px_rgba(19,28,61,.55)]">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-accent/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-lime/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper/10 text-paper ring-1 ring-paper/15 backdrop-blur">
            <FeesIcon width={24} height={24} />
          </span>
          <div>
            <h1 className="text-[1.7rem] font-extrabold leading-tight tracking-[-0.02em]">Fees Management</h1>
            <p className="mt-1 max-w-xl text-[0.9rem] text-paper/65">
              Configure fee heads and structures, assign plans to students, and collect payments.
            </p>
          </div>
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          You have read-only access to fees. Contact your school admin or principal to make changes.
        </div>
      )}

      {/* Modern segmented tabs */}
      <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-sm sm:flex-row sm:items-center">
        {TABS.map((tab) => {
          const active = activeTab === tab.key
          const Icon = tab.icon
          const count = counts[tab.key]
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={active}
              className={`group flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-[0.88rem] font-semibold transition ${
                active
                  ? 'bg-accent text-white shadow-[0_8px_20px_-6px_rgba(238,106,44,.6)]'
                  : 'text-ink/55 hover:bg-paper-2/70 hover:text-ink'
              }`}
            >
              <Icon
                width={18}
                height={18}
                className={active ? 'text-white' : 'text-ink/40 transition group-hover:text-accent'}
              />
              <span>{tab.label}</span>
              {count !== undefined && (
                <span
                  className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold ${
                    active ? 'bg-white/25 text-white' : 'bg-ink/8 text-ink/55'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div>
        {activeTab === 'collections' && <CollectionsTab canEdit={canEdit} />}
        {activeTab === 'structures' && <StructuresTab canEdit={canEdit} />}
        {activeTab === 'heads' && <FeeHeadsTab canEdit={canEdit} />}
      </div>
    </div>
  )
}

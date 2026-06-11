import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import CollectionsTab from './components/CollectionsTab'
import StructuresTab from './components/StructuresTab'
import FeeHeadsTab from './components/FeeHeadsTab'

const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin']

const TABS = [
  { key: 'collections', label: 'Collections' },
  { key: 'structures', label: 'Fee Structures' },
  { key: 'heads', label: 'Fee Heads' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function FeesPage() {
  const { user } = useAuth()
  const canEdit = !!user && EDITOR_ROLES.includes(user.role)
  const [activeTab, setActiveTab] = useState<TabKey>('collections')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.7rem] font-extrabold tracking-[-0.02em] text-ink">Fees Management</h1>
        <p className="mt-1 text-[0.92rem] text-ink/55">
          Configure fee heads and structures, assign plans to students, and collect payments.
        </p>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          You have read-only access to fees. Contact your school admin or principal to make changes.
        </div>
      )}

      <div className="flex gap-2 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`-mb-px rounded-t-xl border-b-2 px-4 py-2.5 text-[0.88rem] font-semibold transition ${
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'collections' && <CollectionsTab canEdit={canEdit} />}
      {activeTab === 'structures' && <StructuresTab canEdit={canEdit} />}
      {activeTab === 'heads' && <FeeHeadsTab canEdit={canEdit} />}
    </div>
  )
}

import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import SessionsTab from './components/SessionsTab'
import ClassesTab from './components/ClassesTab'
import SubjectsTab from './components/SubjectsTab'

const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin']

const TABS = [
  { key: 'sessions', label: 'Academic Sessions' },
  { key: 'classes', label: 'Classes & Sections' },
  { key: 'subjects', label: 'Subjects' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function AcademicSetupPage() {
  const { user } = useAuth()
  const canEdit = !!user && EDITOR_ROLES.includes(user.role)
  const [activeTab, setActiveTab] = useState<TabKey>('sessions')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.7rem] font-extrabold tracking-[-0.02em] text-ink">Academic Setup</h1>
        <p className="mt-1 text-[0.92rem] text-ink/55">
          Manage academic sessions, classes, sections, and subjects for your school.
        </p>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          You have read-only access to academic setup. Contact your school admin or principal to make changes.
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

      {activeTab === 'sessions' && <SessionsTab canEdit={canEdit} />}
      {activeTab === 'classes' && <ClassesTab canEdit={canEdit} />}
      {activeTab === 'subjects' && <SubjectsTab canEdit={canEdit} />}
    </div>
  )
}

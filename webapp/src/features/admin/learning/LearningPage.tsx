import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchAcademicSessions, fetchClasses, fetchSubjects } from '../academic-setup/api'
import HomeworkTab from './components/HomeworkTab'
import MaterialsTab from './components/MaterialsTab'

const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin', 'teacher']

const TABS = [
  { key: 'homework', label: 'Homework' },
  { key: 'materials', label: 'Study Materials' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function LearningPage() {
  const { user } = useAuth()
  const canEdit = !!user && EDITOR_ROLES.includes(user.role)
  const [activeTab, setActiveTab] = useState<TabKey>('homework')

  const { data: academicSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: fetchAcademicSessions,
  })
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
  })
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: fetchSubjects,
  })

  const isSetupLoading = sessionsLoading || classesLoading || subjectsLoading

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.7rem] font-extrabold tracking-[-0.02em] text-ink">Homework & Study Material</h1>
        <p className="mt-1 text-[0.92rem] text-ink/55">
          Assign classwork, publish learning resources, and keep students aligned with the current lessons.
        </p>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          You have read-only access to learning resources. Contact your school admin or principal to make changes.
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`-mb-px whitespace-nowrap rounded-t-xl border-b-2 px-4 py-2.5 text-[0.88rem] font-semibold transition ${
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'homework' && (
        <HomeworkTab
          academicSessions={academicSessions}
          classes={classes}
          subjects={subjects}
          canEdit={canEdit}
          isSetupLoading={isSetupLoading}
        />
      )}
      {activeTab === 'materials' && (
        <MaterialsTab
          academicSessions={academicSessions}
          classes={classes}
          subjects={subjects}
          canEdit={canEdit}
          isSetupLoading={isSetupLoading}
        />
      )}
    </div>
  )
}

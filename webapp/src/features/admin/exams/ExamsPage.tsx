import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchAcademicSessions, fetchClasses, fetchSubjects } from '../academic-setup/api'
import ExamSetupTab from './components/ExamSetupTab'
import MarksEntryTab from './components/MarksEntryTab'
import ResultsTab from './components/ResultsTab'

const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin']
const MARKER_ROLES = [...MANAGER_ROLES, 'teacher']

const TABS = [
  { key: 'setup', label: 'Exams & Schedules' },
  { key: 'marks', label: 'Marks Entry' },
  { key: 'results', label: 'Results' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function ExamsPage() {
  const { user } = useAuth()
  const canManage = !!user && MANAGER_ROLES.includes(user.role)
  const canEnterMarks = !!user && MARKER_ROLES.includes(user.role)
  const [activeTab, setActiveTab] = useState<TabKey>('setup')

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
        <h1 className="text-[1.7rem] font-extrabold tracking-[-0.02em] text-ink">Exams & Results</h1>
        <p className="mt-1 text-[0.92rem] text-ink/55">
          Schedule examinations, record subject marks, and publish class report cards.
        </p>
      </div>

      {!canManage && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          Teachers can view assigned schedules and enter marks. Exam setup and result publication are managed by school leadership.
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

      {activeTab === 'setup' && (
        <ExamSetupTab
          academicSessions={academicSessions}
          classes={classes}
          subjects={subjects}
          canManage={canManage}
          isSetupLoading={isSetupLoading}
        />
      )}
      {activeTab === 'marks' && (
        <MarksEntryTab
          classes={classes}
          canEnterMarks={canEnterMarks}
          isSetupLoading={isSetupLoading}
        />
      )}
      {activeTab === 'results' && (
        <ResultsTab classes={classes} canManage={canManage} isSetupLoading={isSetupLoading} />
      )}
    </div>
  )
}

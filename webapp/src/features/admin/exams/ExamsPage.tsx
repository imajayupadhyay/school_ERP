import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchAcademicSessions, fetchClasses, fetchSubjects } from '../academic-setup/api'
import { CalendarIcon, EditIcon, ExamsIcon, GraduationIcon } from '../components/icons'
import { PageHeader, SegmentedTabs, type TabDef } from '../components/PageHeader'
import ExamSetupTab from './components/ExamSetupTab'
import MarksEntryTab from './components/MarksEntryTab'
import ResultsTab from './components/ResultsTab'

const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin']
const MARKER_ROLES = [...MANAGER_ROLES, 'teacher']

type TabKey = 'setup' | 'marks' | 'results'

const TABS: TabDef<TabKey>[] = [
  { key: 'setup', label: 'Exams & Schedules', icon: CalendarIcon },
  { key: 'marks', label: 'Marks Entry', icon: EditIcon },
  { key: 'results', label: 'Results', icon: GraduationIcon },
]

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
      <PageHeader
        icon={ExamsIcon}
        title="Exams & Results"
        description="Schedule examinations, record subject marks, and publish class report cards."
      />

      {!canManage && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          Teachers can view assigned schedules and enter marks. Exam setup and result publication are managed by school leadership.
        </div>
      )}

      <SegmentedTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

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

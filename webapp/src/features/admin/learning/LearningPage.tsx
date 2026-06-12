import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchAcademicSessions, fetchClasses, fetchSubjects } from '../academic-setup/api'
import { BookIcon, HomeworkIcon } from '../components/icons'
import { PageHeader, SegmentedTabs, type TabDef } from '../components/PageHeader'
import HomeworkTab from './components/HomeworkTab'
import MaterialsTab from './components/MaterialsTab'


type TabKey = 'homework' | 'materials'

const TABS: TabDef<TabKey>[] = [
  { key: 'homework', label: 'Homework', icon: HomeworkIcon },
  { key: 'materials', label: 'Study Materials', icon: BookIcon },
]

export default function LearningPage() {
  const { can } = useAuth()
  const canEdit = can('learning.update')
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
      <PageHeader
        icon={HomeworkIcon}
        title="Homework & Study Material"
        description="Assign classwork, publish learning resources, and keep students aligned with the current lessons."
      />

      {!canEdit && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          You have read-only access to learning resources. Contact your school admin or principal to make changes.
        </div>
      )}

      <SegmentedTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

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

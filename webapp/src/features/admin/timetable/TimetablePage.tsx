import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchAcademicSessions, fetchClasses } from '../academic-setup/api'
import { fetchEmployees } from '../employees/api'
import { CalendarIcon, ClassesIcon, LayersIcon, TeachersIcon } from '../components/icons'
import { PageHeader, SegmentedTabs, type TabDef } from '../components/PageHeader'
import ClassTimetableTab from './components/ClassTimetableTab'
import PeriodScheduleTab from './components/PeriodScheduleTab'
import TeacherTimetableTab from './components/TeacherTimetableTab'

type TabKey = 'class' | 'period' | 'teacher'

const TABS: TabDef<TabKey>[] = [
  { key: 'class', label: 'Class Timetables', icon: ClassesIcon },
  { key: 'period', label: 'Period Schedule', icon: LayersIcon },
  { key: 'teacher', label: 'Teacher View', icon: TeachersIcon },
]

export default function TimetablePage() {
  const { can } = useAuth()
  const canManage = can('timetables.create') && can('timetables.update')
  const [activeTab, setActiveTab] = useState<TabKey>('class')

  const { data: academicSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: fetchAcademicSessions,
  })
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
  })
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['timetable-teachers'],
    queryFn: async () => {
      const res = await fetchEmployees({ page: 1, per_page: 200, employee_type: 'teaching', status: 'active' })
      return res.items
    },
  })

  const isSetupLoading = sessionsLoading || classesLoading || teachersLoading

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarIcon}
        title="Timetable"
        description="Build weekly class timetables, manage the school's period schedule, and review each teacher's week."
      />

      {!canManage && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          Read-only access — you can view published timetables and your own weekly schedule. Building timetables is managed by school leadership.
        </div>
      )}

      <SegmentedTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'class' && (
        <ClassTimetableTab
          academicSessions={academicSessions}
          classes={classes}
          teachers={teachers}
          canManage={canManage}
          isSetupLoading={isSetupLoading}
        />
      )}
      {activeTab === 'period' && <PeriodScheduleTab canManage={canManage} classes={classes} />}
      {activeTab === 'teacher' && (
        <TeacherTimetableTab
          teachers={teachers}
          academicSessions={academicSessions}
          isSetupLoading={isSetupLoading}
        />
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchAcademicSessions, fetchClasses } from '../academic-setup/api'
import type { AcademicSession, SchoolClass } from '../academic-setup/types'
import MarkAttendanceTab from './components/MarkAttendanceTab'
import SessionsTab from './components/SessionsTab'
import ReportsTab from './components/ReportsTab'
import { todayInputValue } from './utils'
import type { AttendanceSession } from './types'

const MARKER_ROLES = ['school_admin', 'principal', 'super_admin', 'teacher']

const TABS = [
  { key: 'mark', label: 'Mark Attendance' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'reports', label: 'Reports' },
] as const

type TabKey = (typeof TABS)[number]['key']

export interface AttendanceFilters {
  academicSessionId: string
  classId: string
  sectionId: string
  attendanceDate: string
}

export default function AttendancePage() {
  const { user } = useAuth()
  const canMark = !!user && MARKER_ROLES.includes(user.role)
  const [activeTab, setActiveTab] = useState<TabKey>('mark')
  const [filters, setFilters] = useState<AttendanceFilters>({
    academicSessionId: '',
    classId: '',
    sectionId: '',
    attendanceDate: todayInputValue(),
  })

  const { data: academicSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: fetchAcademicSessions,
  })

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
  })

  useEffect(() => {
    if (filters.academicSessionId || academicSessions.length === 0) return
    const current = academicSessions.find((session) => session.is_current) ?? academicSessions[0]
    setFilters((currentFilters) => ({
      ...currentFilters,
      academicSessionId: String(current.id),
    }))
  }, [academicSessions, filters.academicSessionId])

  const selectedClass = useMemo(
    () => classes.find((schoolClass) => String(schoolClass.id) === filters.classId) ?? null,
    [classes, filters.classId],
  )

  const handleOpenSession = (session: AttendanceSession) => {
    setFilters({
      academicSessionId: String(session.academic_session_id),
      classId: String(session.class_id),
      sectionId: session.section_id ? String(session.section_id) : '',
      attendanceDate: session.attendance_date,
    })
    setActiveTab('mark')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.7rem] font-extrabold tracking-[-0.02em] text-ink">Attendance Management</h1>
        <p className="mt-1 text-[0.92rem] text-ink/55">
          Mark daily student attendance, review class rosters, and monitor attendance trends.
        </p>
      </div>

      {!canMark && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          You have read-only access to attendance. Contact your school admin or principal to mark rosters.
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

      {activeTab === 'mark' && (
        <MarkAttendanceTab
          academicSessions={academicSessions}
          classes={classes}
          selectedClass={selectedClass}
          filters={filters}
          setFilters={setFilters}
          canMark={canMark}
          isSetupLoading={sessionsLoading || classesLoading}
        />
      )}
      {activeTab === 'sessions' && (
        <SessionsTab
          academicSessions={academicSessions}
          classes={classes}
          onOpenSession={handleOpenSession}
          isSetupLoading={sessionsLoading || classesLoading}
        />
      )}
      {activeTab === 'reports' && (
        <ReportsTab academicSessions={academicSessions} classes={classes} isSetupLoading={sessionsLoading || classesLoading} />
      )}
    </div>
  )
}

export type { AcademicSession, SchoolClass }

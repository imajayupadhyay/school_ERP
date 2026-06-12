import { useEffect, useMemo, useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchAcademicSessions, fetchClasses } from '../academic-setup/api'
import type { AcademicSession, SchoolClass } from '../academic-setup/types'
import { AttendanceIcon, CalendarIcon, ChartBarIcon, CheckIcon } from '../components/icons'
import MarkAttendanceTab from './components/MarkAttendanceTab'
import SessionsTab from './components/SessionsTab'
import ReportsTab from './components/ReportsTab'
import { todayInputValue } from './utils'
import type { AttendanceSession } from './types'


type Icon = ComponentType<SVGProps<SVGSVGElement>>

const TABS: { key: TabKey; label: string; icon: Icon }[] = [
  { key: 'mark', label: 'Mark Attendance', icon: CheckIcon },
  { key: 'sessions', label: 'Sessions', icon: CalendarIcon },
  { key: 'reports', label: 'Reports', icon: ChartBarIcon },
]

type TabKey = 'mark' | 'sessions' | 'reports'

export interface AttendanceFilters {
  academicSessionId: string
  classId: string
  sectionId: string
  attendanceDate: string
}

export default function AttendancePage() {
  const { can } = useAuth()
  const canMark = can('attendance.create')
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
      {/* Header band */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ink to-ink-soft px-6 py-6 text-paper shadow-[0_18px_40px_-24px_rgba(19,28,61,.55)]">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-accent/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-lime/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper/10 text-paper ring-1 ring-paper/15 backdrop-blur">
            <AttendanceIcon width={24} height={24} />
          </span>
          <div>
            <h1 className="text-[1.7rem] font-extrabold leading-tight tracking-[-0.02em]">Attendance Management</h1>
            <p className="mt-1 max-w-xl text-[0.9rem] text-paper/65">
              Mark daily student attendance, review class rosters, and monitor attendance trends.
            </p>
          </div>
        </div>
      </div>

      {!canMark && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          You have read-only access to attendance. Contact your school admin or principal to mark rosters.
        </div>
      )}

      {/* Modern segmented tabs */}
      <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-sm sm:flex-row sm:items-center">
        {TABS.map((tab) => {
          const active = activeTab === tab.key
          const Icon = tab.icon
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
            </button>
          )
        })}
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

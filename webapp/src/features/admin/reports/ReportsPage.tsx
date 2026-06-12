import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchAcademicSessions, fetchClasses } from '../academic-setup/api'
import { AuditIcon, ChartBarIcon, ReportsIcon } from '../components/icons'
import { PageHeader, SegmentedTabs, type TabDef } from '../components/PageHeader'
import AuditLogsTab from './components/AuditLogsTab'
import OverviewTab from './components/OverviewTab'

type TabKey = 'overview' | 'audit'

const TABS: TabDef<TabKey>[] = [
  { key: 'overview', label: 'Reports', icon: ChartBarIcon },
  { key: 'audit', label: 'Audit Logs', icon: AuditIcon },
]

export default function ReportsPage() {
  const { can } = useAuth()
  const canManage = can('reports.view')
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const sessionsQuery = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: fetchAcademicSessions,
    enabled: canManage,
  })
  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
    enabled: canManage,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ReportsIcon}
        title="Reports & Audit Logs"
        description="Review school-wide operational summaries and trace sensitive system activity."
        aside={(
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1 text-[0.78rem] font-semibold text-paper ring-1 ring-paper/15">
            System controls
          </span>
        )}
      />

      {!canManage ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <AuditIcon width={30} height={30} />
          </span>
          <h3 className="mt-4 text-[1.05rem] font-bold text-ink">Permission required</h3>
          <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
            Reports and audit logs are available to school administrators, principals, and platform administrators.
          </p>
        </div>
      ) : (
        <>
          <SegmentedTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
          {activeTab === 'overview' && (
            <OverviewTab
              academicSessions={sessionsQuery.data ?? []}
              classes={classesQuery.data ?? []}
              isSetupLoading={sessionsQuery.isLoading || classesQuery.isLoading}
            />
          )}
          {activeTab === 'audit' && <AuditLogsTab />}
        </>
      )}
    </div>
  )
}

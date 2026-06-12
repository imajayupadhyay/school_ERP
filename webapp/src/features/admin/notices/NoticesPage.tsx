import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { extractErrorMessage } from '@/lib/errors'
import { fetchClasses } from '../academic-setup/api'
import { inputClass } from '../components/FormField'
import StatusBadge from '../components/StatusBadge'
import { ArchiveIcon, ChevronLeftIcon, ChevronRightIcon, EditIcon, EyeIcon, FilterIcon, NoticesIcon, SearchIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import { AddButton, RowAction, TableErrorState, TableSkeleton } from '../components/TableUI'
import {
  archiveNotice,
  fetchNotices,
  markNoticeRead,
} from './api'
import NoticeDetailModal from './components/NoticeDetailModal'
import NoticeFormModal from './components/NoticeFormModal'
import type { Notice } from './types'
import { NOTICE_CATEGORY_LABELS } from './types'

const PER_PAGE = 15

export default function NoticesPage() {
  const { can } = useAuth()
  const canManage = can('notices.create')
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [formNotice, setFormNotice] = useState<Notice | 'new' | null>(null)
  const [detailNotice, setDetailNotice] = useState<Notice | null>(null)

  const params = {
    page,
    per_page: PER_PAGE,
    search: search.trim() || undefined,
    category: category || undefined,
    priority: priority || undefined,
    status: canManage && status ? status : undefined,
  }
  const noticesQuery = useQuery({
    queryKey: ['notices', params],
    queryFn: () => fetchNotices(params),
  })
  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
    enabled: canManage,
  })
  const archiveMutation = useMutation({
    mutationFn: archiveNotice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] }),
    onError: (error) => window.alert(extractErrorMessage(error)),
  })
  const readMutation = useMutation({
    mutationFn: markNoticeRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] }),
  })

  const data = noticesQuery.data
  const notices = data?.items ?? []
  const resetFilters = () => {
    setSearch('')
    setCategory('')
    setPriority('')
    setStatus('')
    setPage(1)
  }
  const openNotice = (notice: Notice) => {
    setDetailNotice(notice)
    if (!canManage && !notice.is_read) readMutation.mutate(notice.id)
  }

  const activeFilters = [search, category, priority, status].filter(Boolean).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={NoticesIcon}
        title="Notices & Communication"
        description="Publish circulars and alerts to school-wide, role-based, class, section, or individual audiences."
        actions={canManage ? <AddButton label="Add Notice" onClick={() => setFormNotice('new')} /> : undefined}
      />

      {!canManage && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          This feed contains published notices for staff, teachers, and your assigned classes.
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
            <FilterIcon width={16} height={16} className="text-accent" />
            Filters
            {activeFilters > 0 && (
              <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[0.7rem] font-bold text-accent">{activeFilters} active</span>
            )}
          </div>
          {activeFilters > 0 && (
            <button type="button" onClick={resetFilters} className="text-[0.78rem] font-semibold text-ink/45 transition hover:text-accent">
              Clear all
            </button>
          )}
        </div>
        <div className={`grid gap-3 ${canManage ? 'lg:grid-cols-[minmax(200px,1fr)_160px_150px_150px]' : 'lg:grid-cols-[minmax(220px,1fr)_170px_160px]'}`}>
          <label className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={17} height={17} />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              className={`${inputClass} pl-9`}
              placeholder="Search notices"
              aria-label="Search notices"
            />
          </label>
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }} className={inputClass} aria-label="Category">
            <option value="">All categories</option>
            {Object.entries(NOTICE_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1) }} className={inputClass} aria-label="Priority">
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="important">Important</option>
            <option value="normal">Normal</option>
          </select>
          {canManage && (
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className={inputClass} aria-label="Status">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          )}
        </div>
      </div>

      {noticesQuery.isLoading ? (
        <TableSkeleton rows={6} />
      ) : noticesQuery.isError ? (
        <TableErrorState message={extractErrorMessage(noticesQuery.error)} onRetry={() => noticesQuery.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">Notice</th>
                  <th className="px-4 py-3.5 font-bold">Audience</th>
                  <th className="px-4 py-3.5 font-bold">Publication</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  {canManage && <th className="px-4 py-3.5 font-bold">Reads</th>}
                  <th className="px-5 py-3.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {notices.length === 0 ? (
                  <tr><td colSpan={canManage ? 6 : 5} className="px-6 py-12 text-center text-[0.86rem] text-ink/40">No notices match the current filters.</td></tr>
                ) : notices.map((notice) => (
                  <tr key={notice.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-2">
                        {!canManage && !notice.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" title="Unread" />}
                        <div>
                          <p className="font-semibold text-ink">{notice.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.73rem] text-ink/45">
                            <span>{NOTICE_CATEGORY_LABELS[notice.category]}</span>
                            <PriorityBadge priority={notice.priority} />
                            {notice.attachment_url && <span>Attachment</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[250px] px-4 py-3 text-ink/60">
                      <p className="line-clamp-2">{notice.targets.map((target) => target.label).join(', ')}</p>
                    </td>
                    <td className="px-4 py-3 text-ink/60">
                      {notice.publish_at ? formatDateTime(notice.publish_at) : 'Not scheduled'}
                      {notice.expires_at && <p className="text-[0.73rem] text-ink/40">Expires {formatDateTime(notice.expires_at)}</p>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={notice.delivery_status} /></td>
                    {canManage && (
                      <td className="px-4 py-3 text-ink/60">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/10">
                            <div className="h-full rounded-full bg-[#168a66] transition-all" style={{ width: `${notice.read_percentage}%` }} />
                          </div>
                          <span className="text-[0.78rem] font-semibold text-ink/70">{notice.read_count}/{notice.recipient_count}</span>
                        </div>
                        <p className="mt-0.5 text-[0.73rem] text-ink/40">{notice.read_percentage}% read</p>
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                        <RowAction label="View" onClick={() => openNotice(notice)}>
                          <EyeIcon width={17} height={17} />
                        </RowAction>
                        {canManage && (
                          <>
                            <RowAction label="Edit" onClick={() => setFormNotice(notice)}>
                              <EditIcon width={17} height={17} />
                            </RowAction>
                            {notice.status !== 'archived' && (
                              <RowAction
                                label="Archive"
                                danger
                                onClick={() => {
                                  if (window.confirm(`Archive notice "${notice.title}"?`)) archiveMutation.mutate(notice.id)
                                }}
                              >
                                <ArchiveIcon width={17} height={17} />
                              </RowAction>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[0.84rem] text-ink/55 shadow-sm">
              <span>Showing <span className="font-semibold text-ink/75">{data.meta.from ?? 0}–{data.meta.to ?? 0}</span> of <span className="font-semibold text-ink/75">{data.meta.total}</span></span>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink/65">
                  <ChevronLeftIcon width={16} height={16} />
                  Prev
                </button>
                <span className="px-2 text-[0.8rem] font-semibold text-ink/45">{data.meta.current_page} / {data.meta.last_page}</span>
                <button type="button" disabled={page >= data.meta.last_page} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink/65">
                  Next
                  <ChevronRightIcon width={16} height={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {formNotice && (
        <NoticeFormModal
          notice={formNotice === 'new' ? null : formNotice}
          classes={classesQuery.data ?? []}
          onClose={() => setFormNotice(null)}
          onSaved={async () => {
            setFormNotice(null)
            await queryClient.invalidateQueries({ queryKey: ['notices'] })
          }}
        />
      )}
      {detailNotice && (
        <NoticeDetailModal notice={detailNotice} canManage={canManage} onClose={() => setDetailNotice(null)} />
      )}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: Notice['priority'] }) {
  const style = priority === 'urgent'
    ? 'bg-[#dc2626]/10 text-[#dc2626]'
    : priority === 'important'
      ? 'bg-[#d6991f]/15 text-[#b45309]'
      : 'bg-ink/7 text-ink/50'
  return <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${style}`}>{priority}</span>
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

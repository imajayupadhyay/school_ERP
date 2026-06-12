import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { extractErrorMessage } from '@/lib/errors'
import { fetchClasses } from '../academic-setup/api'
import { inputClass } from '../components/FormField'
import StatusBadge from '../components/StatusBadge'
import {
  archiveNotice,
  fetchNotices,
  markNoticeRead,
} from './api'
import NoticeDetailModal from './components/NoticeDetailModal'
import NoticeFormModal from './components/NoticeFormModal'
import type { Notice } from './types'
import { NOTICE_CATEGORY_LABELS } from './types'

const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin']
const PER_PAGE = 15

export default function NoticesPage() {
  const { user } = useAuth()
  const canManage = !!user && MANAGER_ROLES.includes(user.role)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.7rem] font-extrabold tracking-[-0.02em] text-ink">Notices & Communication</h1>
          <p className="mt-1 text-[0.92rem] text-ink/55">
            Publish circulars and alerts to school-wide, role-based, class, section, or individual audiences.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setFormNotice('new')}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
          >
            Add Notice
          </button>
        )}
      </div>

      {!canManage && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          This feed contains published notices for staff, teachers, and your assigned classes.
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-4">
        <div className={`grid gap-3 ${canManage ? 'lg:grid-cols-[minmax(200px,1fr)_160px_150px_150px_auto]' : 'lg:grid-cols-[minmax(220px,1fr)_170px_160px_auto]'}`}>
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1) }}
            className={inputClass}
            placeholder="Search notices"
            aria-label="Search notices"
          />
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
          <button type="button" onClick={resetFilters} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink/65 hover:border-accent hover:text-accent">
            Reset
          </button>
        </div>
      </div>

      {noticesQuery.isLoading ? (
        <div className="h-80 animate-pulse rounded-2xl bg-ink/5" />
      ) : noticesQuery.isError ? (
        <ErrorState message={extractErrorMessage(noticesQuery.error)} onRetry={() => noticesQuery.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
                  <th className="px-5 py-3 font-semibold">Notice</th>
                  <th className="px-4 py-3 font-semibold">Audience</th>
                  <th className="px-4 py-3 font-semibold">Publication</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  {canManage && <th className="px-4 py-3 font-semibold">Reads</th>}
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {notices.length === 0 ? (
                  <tr><td colSpan={canManage ? 6 : 5} className="px-6 py-12 text-center text-ink/40">No notices match the current filters.</td></tr>
                ) : notices.map((notice) => (
                  <tr key={notice.id} className="border-b border-line/60 last:border-0 hover:bg-paper/50">
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
                        <p className="font-semibold text-ink">{notice.read_count} / {notice.recipient_count}</p>
                        <p className="text-[0.73rem] text-ink/40">{notice.read_percentage}% read</p>
                      </td>
                    )}
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => openNotice(notice)} className="text-[0.78rem] font-semibold text-accent hover:underline">View</button>
                        {canManage && (
                          <>
                            <button type="button" onClick={() => setFormNotice(notice)} className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent">Edit</button>
                            {notice.status !== 'archived' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Archive notice "${notice.title}"?`)) archiveMutation.mutate(notice.id)
                                }}
                                className="text-[0.78rem] font-semibold text-[#dc2626] hover:underline"
                              >
                                Archive
                              </button>
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
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[0.84rem] text-ink/55">
              <span>Showing {data.meta.from ?? 0}-{data.meta.to ?? 0} of {data.meta.total}</span>
              <div className="ml-auto flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-lg border border-line px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button>
                <button type="button" disabled={page >= data.meta.last_page} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-line px-3 py-1.5 font-semibold disabled:opacity-40">Next</button>
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

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-white px-5 py-14 text-center">
      <div>
        <p className="text-[0.9rem] font-semibold text-ink">Unable to load notices</p>
        <p className="mt-1 text-[0.82rem] text-ink/50">{message}</p>
        <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white">Try again</button>
      </div>
    </div>
  )
}

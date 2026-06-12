import { useQuery } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { fetchNoticeDelivery } from '../api'
import type { Notice } from '../types'
import { NOTICE_CATEGORY_LABELS } from '../types'

export default function NoticeDetailModal({
  notice,
  canManage,
  onClose,
}: {
  notice: Notice
  canManage: boolean
  onClose: () => void
}) {
  const deliveryQuery = useQuery({
    queryKey: ['notice-delivery', notice.id],
    queryFn: () => fetchNoticeDelivery(notice.id),
    enabled: canManage,
  })

  return (
    <Modal title={notice.title} description={`${NOTICE_CATEGORY_LABELS[notice.category]} / ${notice.priority} priority`} onClose={onClose} size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={notice.delivery_status} />
          {notice.targets.map((target) => (
            <span key={target.id} className="rounded-full border border-line bg-paper/50 px-2.5 py-1 text-[0.72rem] font-semibold text-ink/55">
              {target.label}
            </span>
          ))}
        </div>

        <div className="whitespace-pre-wrap rounded-xl border border-line bg-paper/30 px-4 py-4 text-[0.9rem] leading-6 text-ink/75">
          {notice.body}
        </div>

        <div className="grid gap-3 text-[0.8rem] sm:grid-cols-3">
          <Info label="Published" value={notice.publish_at ? formatDateTime(notice.publish_at) : 'Not published'} />
          <Info label="Expires" value={notice.expires_at ? formatDateTime(notice.expires_at) : 'No expiry'} />
          <Info label="Created by" value={notice.creator?.name ?? 'Unknown'} />
        </div>

        {notice.attachment_url && (
          <a
            href={notice.attachment_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-accent hover:border-accent"
          >
            Open Attachment
          </a>
        )}

        {canManage && (
          <div className="border-t border-line pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[0.9rem] font-bold text-ink">Delivery & Reads</p>
                <p className="text-[0.75rem] text-ink/45">Only recipients with active portal accounts are counted.</p>
              </div>
              {deliveryQuery.data && (
                <p className="text-[0.82rem] font-semibold text-ink/60">
                  {deliveryQuery.data.read_count} of {deliveryQuery.data.recipient_count} read
                </p>
              )}
            </div>

            {deliveryQuery.isLoading ? (
              <div className="h-36 animate-pulse rounded-xl bg-ink/5" />
            ) : deliveryQuery.isError ? (
              <p className="rounded-xl border border-line bg-paper/40 px-4 py-4 text-[0.82rem] text-[#dc2626]">
                {extractErrorMessage(deliveryQuery.error)}
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-line">
                <table className="w-full text-left text-[0.8rem]">
                  <thead className="sticky top-0 bg-paper">
                    <tr className="border-b border-line text-[0.7rem] uppercase tracking-wider text-ink/45">
                      <th className="px-4 py-2.5 font-semibold">Recipient</th>
                      <th className="px-4 py-2.5 font-semibold">Role</th>
                      <th className="px-4 py-2.5 font-semibold">Read status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(deliveryQuery.data?.recipients ?? []).length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-ink/40">No active portal recipients match this audience yet.</td></tr>
                    ) : deliveryQuery.data?.recipients.map((recipient) => (
                      <tr key={recipient.id} className="border-b border-line/60 last:border-0">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-ink">{recipient.name}</p>
                          <p className="text-[0.7rem] text-ink/40">{recipient.email}</p>
                        </td>
                        <td className="px-4 py-2.5 capitalize text-ink/60">{recipient.role.replaceAll('_', ' ')}</td>
                        <td className="px-4 py-2.5">
                          {recipient.read_at
                            ? <span className="font-semibold text-[#168a66]">Read {formatDateTime(recipient.read_at)}</span>
                            : <span className="text-ink/40">Unread</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2.5">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p className="mt-1 font-medium text-ink/65">{value}</p>
    </div>
  )
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

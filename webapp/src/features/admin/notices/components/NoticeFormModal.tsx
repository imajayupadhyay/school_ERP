import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import type { SchoolClass } from '../../academic-setup/types'
import { fetchEmployees } from '../../employees/api'
import { fetchGuardians } from '../../guardians/api'
import { fetchStudents } from '../../students/api'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import { createNotice, updateNotice, uploadNoticeAttachment } from '../api'
import type {
  Notice,
  NoticeCategory,
  NoticePayload,
  NoticePriority,
  NoticeStatus,
  NoticeTargetPayload,
  NoticeTargetType,
} from '../types'
import { NOTICE_CATEGORY_LABELS } from '../types'

interface Props {
  notice: Notice | null
  classes: SchoolClass[]
  onClose: () => void
  onSaved: () => void
}

interface AudienceTarget extends NoticeTargetPayload {
  key: string
  label: string
}

interface RecipientOption {
  id: number
  label: string
  detail: string
}

const ROLE_OPTIONS = [
  { value: 'teacher', label: 'All teachers' },
  { value: 'employee', label: 'All employees' },
  { value: 'parent', label: 'All parents' },
  { value: 'student', label: 'All students' },
]

export default function NoticeFormModal({ notice, classes, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(notice?.title ?? '')
  const [body, setBody] = useState(notice?.body ?? '')
  const [category, setCategory] = useState<NoticeCategory>(notice?.category ?? 'general')
  const [priority, setPriority] = useState<NoticePriority>(notice?.priority ?? 'normal')
  const [status, setStatus] = useState<NoticeStatus>(notice?.status ?? 'draft')
  const [publishAt, setPublishAt] = useState(toDateTimeInput(notice?.publish_at))
  const [expiresAt, setExpiresAt] = useState(toDateTimeInput(notice?.expires_at))
  const [targets, setTargets] = useState<AudienceTarget[]>(() => notice?.targets.map((target) => ({
    key: targetKey(target.type, target.target_id, target.value),
    type: target.type,
    id: target.target_id,
    value: target.value,
    label: target.label,
  })) ?? [])
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [recipientType, setRecipientType] = useState<'student' | 'guardian' | 'employee'>('student')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [error, setError] = useState('')

  const selectedClass = useMemo(
    () => classes.find((schoolClass) => String(schoolClass.id) === classId) ?? null,
    [classes, classId],
  )
  const recipientQuery = useQuery({
    queryKey: ['notice-recipient-search', recipientType, recipientSearch],
    queryFn: () => searchRecipients(recipientType, recipientSearch.trim()),
    enabled: recipientSearch.trim().length >= 2,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (targets.length === 0) throw new Error('Add at least one audience target.')

      const payload: NoticePayload = {
        title: title.trim(),
        body: body.trim(),
        category,
        priority,
        status,
        publish_at: status === 'draft' ? null : toIso(publishAt),
        expires_at: toIso(expiresAt),
        targets: targets.map(({ type, id, value }) => ({ type, id: id ?? null, value: value ?? null })),
      }
      const saved = notice ? await updateNotice(notice.id, payload) : await createNotice(payload)
      return attachment ? uploadNoticeAttachment(saved.id, attachment) : saved
    },
    onSuccess: onSaved,
    onError: (err) => setError(
      err instanceof Error && err.message === 'Add at least one audience target.'
        ? err.message
        : extractErrorMessage(err),
    ),
  })

  const hasTarget = (type: NoticeTargetType, id?: number | null, value?: string | null) =>
    targets.some((target) => target.key === targetKey(type, id, value))

  const addTarget = (target: AudienceTarget) => {
    setTargets((current) => {
      if (current.some((item) => item.key === target.key)) return current
      if (target.type === 'school') return [target]
      return [...current.filter((item) => item.type !== 'school'), target]
    })
  }

  const toggleRole = (value: string, label: string) => {
    const key = targetKey('role', null, value)
    setTargets((current) => current.some((item) => item.key === key)
      ? current.filter((item) => item.key !== key)
      : [...current.filter((item) => item.type !== 'school'), { key, type: 'role', value, label }])
  }

  const addClassTarget = () => {
    if (!selectedClass) return
    if (sectionId) {
      const section = selectedClass.sections.find((item) => String(item.id) === sectionId)
      if (!section) return
      addTarget({
        key: targetKey('section', section.id),
        type: 'section',
        id: section.id,
        label: `${selectedClass.name} - Section ${section.name}`,
      })
    } else {
      addTarget({
        key: targetKey('class', selectedClass.id),
        type: 'class',
        id: selectedClass.id,
        label: selectedClass.name,
      })
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    saveMutation.mutate()
  }

  return (
    <Modal
      title={notice ? 'Edit Notice' : 'Add Notice'}
      description="Set the message, publication timing, and exact audience."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title" htmlFor="notice-title">
            <input id="notice-title" required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="Notice title" />
          </FormField>
          <FormField label="Category" htmlFor="notice-category">
            <select id="notice-category" value={category} onChange={(event) => setCategory(event.target.value as NoticeCategory)} className={inputClass}>
              {Object.entries(NOTICE_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Message" htmlFor="notice-body">
          <textarea id="notice-body" required rows={6} maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} className={inputClass} placeholder="Write the circular, announcement, or alert." />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Priority" htmlFor="notice-priority">
            <select id="notice-priority" value={priority} onChange={(event) => setPriority(event.target.value as NoticePriority)} className={inputClass}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </FormField>
          <FormField label="Status" htmlFor="notice-status">
            <select id="notice-status" value={status} onChange={(event) => setStatus(event.target.value as NoticeStatus)} className={inputClass}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              {notice?.status === 'archived' && <option value="archived">Archived</option>}
            </select>
          </FormField>
          <FormField label="Publish date & time" htmlFor="notice-publish" hint={status === 'published' ? 'Leave blank to publish now' : undefined}>
            <input
              id="notice-publish"
              type="datetime-local"
              required={status === 'scheduled'}
              disabled={status === 'draft'}
              value={publishAt}
              onChange={(event) => setPublishAt(event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Expiry date & time" htmlFor="notice-expiry" hint="Optional">
            <input id="notice-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={inputClass} />
          </FormField>
        </div>

        <div className="rounded-xl border border-line bg-paper/35 p-4">
          <div>
            <p className="text-[0.88rem] font-bold text-ink">Audience</p>
            <p className="mt-0.5 text-[0.76rem] text-ink/45">Combine roles, classes, sections, and individual recipients.</p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[0.76rem] font-semibold uppercase tracking-wider text-ink/45">School & roles</p>
                <button
                  type="button"
                  onClick={() => addTarget({ key: 'school:all', type: 'school', label: 'Entire school' })}
                  className={`mb-2 w-full rounded-xl border px-3 py-2.5 text-left text-[0.82rem] font-semibold transition ${
                    hasTarget('school') ? 'border-accent bg-accent/5 text-accent' : 'border-line bg-white text-ink/65'
                  }`}
                >
                  Entire school
                </button>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ROLE_OPTIONS.map((role) => (
                    <label key={role.value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[0.8rem] text-ink/65">
                      <input type="checkbox" checked={hasTarget('role', null, role.value)} onChange={() => toggleRole(role.value, role.label)} className="size-4 accent-accent" />
                      {role.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[0.76rem] font-semibold uppercase tracking-wider text-ink/45">Class or section</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                  <select value={classId} onChange={(event) => { setClassId(event.target.value); setSectionId('') }} className={inputClass} aria-label="Audience class">
                    <option value="">Select class</option>
                    {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
                  </select>
                  <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} className={inputClass} disabled={!selectedClass} aria-label="Audience section">
                    <option value="">All sections</option>
                    {selectedClass?.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                  </select>
                  <button type="button" onClick={addClassTarget} disabled={!selectedClass} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 hover:border-accent hover:text-accent disabled:opacity-40">
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[0.76rem] font-semibold uppercase tracking-wider text-ink/45">Individual recipient</p>
              <div className="grid gap-2 sm:grid-cols-[130px_1fr]">
                <select
                  value={recipientType}
                  onChange={(event) => {
                    setRecipientType(event.target.value as typeof recipientType)
                    setRecipientSearch('')
                  }}
                  className={inputClass}
                  aria-label="Recipient type"
                >
                  <option value="student">Student</option>
                  <option value="guardian">Parent</option>
                  <option value="employee">Employee</option>
                </select>
                <input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} className={inputClass} placeholder="Type at least 2 characters" />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-line bg-white">
                {recipientSearch.trim().length < 2 ? (
                  <p className="px-4 py-5 text-center text-[0.78rem] text-ink/40">Search by name, code, email, or admission number.</p>
                ) : recipientQuery.isFetching ? (
                  <p className="px-4 py-5 text-center text-[0.78rem] text-ink/40">Searching...</p>
                ) : (recipientQuery.data ?? []).length === 0 ? (
                  <p className="px-4 py-5 text-center text-[0.78rem] text-ink/40">No recipients found.</p>
                ) : recipientQuery.data?.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => addTarget({
                      key: targetKey(recipientType, option.id),
                      type: recipientType,
                      id: option.id,
                      label: option.label,
                    })}
                    className="flex w-full items-center justify-between gap-3 border-b border-line/60 px-3 py-2.5 text-left last:border-0 hover:bg-paper/50"
                  >
                    <span>
                      <span className="block text-[0.82rem] font-semibold text-ink">{option.label}</span>
                      <span className="block text-[0.72rem] text-ink/45">{option.detail}</span>
                    </span>
                    <span className="text-[0.74rem] font-semibold text-accent">
                      {hasTarget(recipientType, option.id) ? 'Added' : 'Add'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-[0.76rem] font-semibold uppercase tracking-wider text-ink/45">Selected audience ({targets.length})</p>
            {targets.length === 0 ? (
              <p className="text-[0.8rem] text-[#dc2626]">Add at least one audience target.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {targets.map((target) => (
                  <span key={target.key} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[0.76rem] font-semibold text-ink/60">
                    {target.label}
                    <button type="button" onClick={() => setTargets((current) => current.filter((item) => item.key !== target.key))} className="text-ink/35 hover:text-[#dc2626]" aria-label={`Remove ${target.label}`}>x</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <FormField label="Attachment" htmlFor="notice-attachment" hint="PDF, Word, JPG, PNG, or WebP up to 10 MB">
          <input
            id="notice-attachment"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
            className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-paper-2 file:px-3 file:py-1 file:text-[0.78rem] file:font-semibold file:text-ink`}
          />
        </FormField>

        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink/65">Cancel</button>
          <button type="submit" disabled={saveMutation.isPending} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-45">
            {saveMutation.isPending ? 'Saving...' : 'Save Notice'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

async function searchRecipients(type: 'student' | 'guardian' | 'employee', search: string): Promise<RecipientOption[]> {
  if (type === 'student') {
    const result = await fetchStudents({ page: 1, per_page: 10, search, status: 'active' })
    return result.items.map((student) => ({
      id: student.id,
      label: student.full_name,
      detail: `${student.admission_no ?? 'No admission no'} / ${student.class_name ?? 'No class'}${student.section ? ` ${student.section}` : ''}`,
    }))
  }

  if (type === 'guardian') {
    const result = await fetchGuardians({ page: 1, per_page: 10, search, status: 'active' })
    return result.items.map((guardian) => ({
      id: guardian.id,
      label: guardian.name,
      detail: guardian.email ?? guardian.phone ?? 'No contact detail',
    }))
  }

  const result = await fetchEmployees({ page: 1, per_page: 10, search, status: 'active' })
  return result.items.map((employee) => ({
    id: employee.id,
    label: employee.full_name,
    detail: `${employee.employee_code} / ${employee.designation ?? employee.employee_type}`,
  }))
}

function targetKey(type: NoticeTargetType, id?: number | null, value?: string | null): string {
  return `${type}:${id ?? value ?? 'all'}`
}

function toDateTimeInput(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

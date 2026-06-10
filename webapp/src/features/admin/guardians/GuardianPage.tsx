import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchStudents } from '@/features/admin/students/api'
import type { Student } from '@/features/admin/students/types'
import { extractErrorMessage } from '@/lib/errors'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { PlusIcon, SearchIcon } from '../components/icons'
import {
  archiveGuardian,
  createGuardian,
  fetchGuardians,
  resetGuardianPassword,
  syncGuardianStudents,
  updateGuardian,
} from './api'
import type {
  Guardian,
  GuardianListParams,
  GuardianPayload,
  GuardianStudentPayload,
  GuardianStudentRef,
} from './types'

const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin']
const PER_PAGE = 12

type GuardianFormValues = Record<string, string | boolean | undefined> & {
  portal_enabled?: boolean
}

type ChildDraft = {
  student_id: number
  admission_no: string | null
  full_name: string
  class_name: string | null
  section: string | null
  relationship: string
  is_primary: boolean
  is_emergency_contact: boolean
  pickup_allowed: boolean
}

export default function GuardianPage() {
  const { user } = useAuth()
  const canManage = !!user && MANAGER_ROLES.includes(user.role)
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [portalStatus, setPortalStatus] = useState('')
  const [guardianModal, setGuardianModal] = useState<Guardian | 'new' | null>(null)
  const [profileModal, setProfileModal] = useState<Guardian | null>(null)
  const [childrenModal, setChildrenModal] = useState<Guardian | null>(null)
  const [resetModal, setResetModal] = useState<Guardian | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const params: GuardianListParams = {
    page,
    per_page: PER_PAGE,
    search: search.trim() || undefined,
    status: status || undefined,
    portal_status: portalStatus || undefined,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['guardians', params],
    queryFn: () => fetchGuardians(params),
    enabled: canManage,
  })

  const invalidateGuardians = () => queryClient.invalidateQueries({ queryKey: ['guardians'] })

  const saveMutation = useMutation({
    mutationFn: (vars: { id?: number; payload: GuardianPayload }) =>
      vars.id ? updateGuardian(vars.id, vars.payload) : createGuardian(vars.payload),
    onSuccess: () => {
      invalidateGuardians()
      setGuardianModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const archiveMutation = useMutation({
    mutationFn: archiveGuardian,
    onSuccess: invalidateGuardians,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const childrenMutation = useMutation({
    mutationFn: (vars: { id: number; students: GuardianStudentPayload[] }) =>
      syncGuardianStudents(vars.id, vars.students),
    onSuccess: () => {
      invalidateGuardians()
      setChildrenModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const resetMutation = useMutation({
    mutationFn: (vars: { id: number; password: string }) => resetGuardianPassword(vars.id, vars.password),
    onSuccess: () => {
      invalidateGuardians()
      setResetModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[1.7rem] font-extrabold tracking-[-0.02em] text-ink">Parents & Guardians</h1>
          <p className="mt-1 text-[0.92rem] text-ink/55">Parent contact and portal access records.</p>
        </div>
        <div className="rounded-2xl border border-line bg-white px-5 py-8 text-ink/60">
          You do not have permission to view parent and guardian contact records.
        </div>
      </div>
    )
  }

  const guardians = data?.items ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[1.7rem] font-extrabold tracking-[-0.02em] text-ink">Parents & Guardians</h1>
          <p className="mt-1 text-[0.92rem] text-ink/55">
            Manage parent contacts, child links, pickup permissions, and parent portal access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setGuardianModal('new')}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
        >
          <PlusIcon width={16} height={16} />
          Add Guardian
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_170px_170px_auto]">
          <label className="relative">
            <span className="sr-only">Search guardians</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={17} height={17} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className={`${inputClass} pl-9`}
              placeholder="Search guardian, phone, email, or child"
            />
          </label>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className={inputClass}
            aria-label="Guardian status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={portalStatus}
            onChange={(event) => {
              setPortalStatus(event.target.value)
              setPage(1)
            }}
            className={inputClass}
            aria-label="Portal status"
          >
            <option value="">Any portal</option>
            <option value="active">Portal active</option>
            <option value="inactive">Portal inactive</option>
            <option value="suspended">Portal suspended</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch('')
              setStatus('')
              setPortalStatus('')
              setPage(1)
            }}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
          >
            Reset
          </button>
        </div>
      </div>

      {isLoading ? (
        <GuardianTableSkeleton />
      ) : isError ? (
        <GuardianErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[980px] text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.72rem] uppercase tracking-wider text-ink/45">
                  <th className="px-5 py-3 font-semibold">Guardian</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Children</th>
                  <th className="px-4 py-3 font-semibold">Portal</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {guardians.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-ink/40">
                      No guardians match the current filters.
                    </td>
                  </tr>
                ) : (
                  guardians.map((guardian) => (
                    <GuardianRow
                      key={guardian.id}
                      guardian={guardian}
                      onView={() => setProfileModal(guardian)}
                      onEdit={() => setGuardianModal(guardian)}
                      onChildren={() => setChildrenModal(guardian)}
                      onReset={() => setResetModal(guardian)}
                      onArchive={() => {
                        if (window.confirm(`Archive ${guardian.name}? Parent portal access will be deactivated.`)) {
                          archiveMutation.mutate(guardian.id)
                        }
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && (
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-[0.84rem] text-ink/55 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {meta.from ?? 0}-{meta.to ?? 0} of {meta.total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  className="rounded-xl border border-line bg-white px-4 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((current) => Math.min(current + 1, meta.last_page))}
                  className="rounded-xl border border-line bg-white px-4 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {guardianModal && (
        <GuardianFormModal
          guardian={guardianModal === 'new' ? null : guardianModal}
          onClose={() => {
            setGuardianModal(null)
            setModalError(null)
          }}
          onSubmit={(payload) =>
            saveMutation.mutate({ id: guardianModal === 'new' ? undefined : guardianModal.id, payload })
          }
          isSaving={saveMutation.isPending}
          error={modalError}
        />
      )}

      {profileModal && <GuardianProfileModal guardian={profileModal} onClose={() => setProfileModal(null)} />}

      {childrenModal && (
        <ChildrenModal
          guardian={childrenModal}
          onClose={() => {
            setChildrenModal(null)
            setModalError(null)
          }}
          onSubmit={(students) => childrenMutation.mutate({ id: childrenModal.id, students })}
          isSaving={childrenMutation.isPending}
          error={modalError}
        />
      )}

      {resetModal && (
        <ResetPasswordModal
          guardian={resetModal}
          onClose={() => {
            setResetModal(null)
            setModalError(null)
          }}
          onSubmit={(password) => resetMutation.mutate({ id: resetModal.id, password })}
          isSaving={resetMutation.isPending}
          error={modalError}
        />
      )}
    </div>
  )
}

function GuardianRow({
  guardian,
  onView,
  onEdit,
  onChildren,
  onReset,
  onArchive,
}: {
  guardian: Guardian
  onView: () => void
  onEdit: () => void
  onChildren: () => void
  onReset: () => void
  onArchive: () => void
}) {
  return (
    <tr className="border-b border-line/60 last:border-0 hover:bg-paper/50">
      <td className="px-5 py-3">
        <div className="font-semibold text-ink">{guardian.name}</div>
        <div className="mt-0.5 text-[0.76rem] text-ink/45">{guardian.relation ?? 'Guardian'}</div>
      </td>
      <td className="px-4 py-3 text-ink/65">
        <div>{guardian.phone ?? '-'}</div>
        <div className="mt-0.5 text-[0.76rem] text-ink/45">{guardian.email ?? '-'}</div>
      </td>
      <td className="px-4 py-3">
        <ChildSummary students={guardian.students} />
      </td>
      <td className="px-4 py-3">
        {guardian.portal.has_login ? <StatusBadge status={guardian.portal.status ?? 'inactive'} /> : <span className="text-ink/35">No portal</span>}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={guardian.status} />
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onView} className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent">
            View
          </button>
          <button type="button" onClick={onChildren} className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent">
            Children
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!guardian.portal.has_login}
            className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent disabled:cursor-not-allowed disabled:text-ink/25"
          >
            Reset
          </button>
          <button type="button" onClick={onEdit} className="text-[0.78rem] font-semibold text-ink/60 hover:text-accent">
            Edit
          </button>
          <button type="button" onClick={onArchive} className="text-[0.78rem] font-semibold text-[#dc2626] hover:underline">
            Archive
          </button>
        </div>
      </td>
    </tr>
  )
}

function GuardianFormModal({
  guardian,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  guardian: Guardian | null
  onClose: () => void
  onSubmit: (payload: GuardianPayload) => void
  isSaving: boolean
  error: string | null
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GuardianFormValues>({
    defaultValues: guardian
      ? {
          name: guardian.name,
          relation: guardian.relation ?? '',
          phone: guardian.phone ?? '',
          alternate_phone: guardian.alternate_phone ?? '',
          email: guardian.email ?? '',
          occupation: guardian.occupation ?? '',
          address: guardian.address ?? '',
          status: guardian.status,
          portal_enabled: guardian.portal.has_login,
          portal_email: guardian.portal.email ?? guardian.email ?? '',
          portal_password: '',
          portal_status: guardian.portal.status ?? 'active',
        }
      : {
          name: '',
          relation: '',
          phone: '',
          alternate_phone: '',
          email: '',
          occupation: '',
          address: '',
          status: 'active',
          portal_enabled: false,
          portal_email: '',
          portal_password: '',
          portal_status: 'active',
        },
  })

  const portalEnabled = watch('portal_enabled')

  return (
    <Modal title={guardian ? 'Edit Guardian' : 'Add Guardian'} description="Contact details and parent portal access." onClose={onClose} size="lg">
      <form onSubmit={handleSubmit((values) => onSubmit(toGuardianPayload(values)))} className="space-y-5">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Name" htmlFor="guardian_name" error={errors.name}>
            <input id="guardian_name" className={inputClass} {...register('name', { required: 'Name is required.' })} />
          </FormField>
          <FormField label="Relation" htmlFor="guardian_relation" error={errors.relation}>
            <input id="guardian_relation" className={inputClass} placeholder="Father, Mother, Guardian" {...register('relation')} />
          </FormField>
          <FormField label="Status" htmlFor="guardian_status" error={errors.status}>
            <select id="guardian_status" className={inputClass} {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Phone" htmlFor="guardian_phone" error={errors.phone}>
            <input id="guardian_phone" className={inputClass} {...register('phone')} />
          </FormField>
          <FormField label="Alternate Phone" htmlFor="guardian_alt_phone" error={errors.alternate_phone}>
            <input id="guardian_alt_phone" className={inputClass} {...register('alternate_phone')} />
          </FormField>
          <FormField label="Email" htmlFor="guardian_email" error={errors.email}>
            <input id="guardian_email" type="email" className={inputClass} {...register('email')} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Occupation" htmlFor="guardian_occupation" error={errors.occupation}>
            <input id="guardian_occupation" className={inputClass} {...register('occupation')} />
          </FormField>
          <FormField label="Address" htmlFor="guardian_address" error={errors.address}>
            <textarea id="guardian_address" rows={2} className={inputClass} {...register('address')} />
          </FormField>
        </div>

        <div className="rounded-2xl border border-line bg-paper/45 p-4">
          <label className="flex items-center gap-3 text-[0.9rem] font-semibold text-ink">
            <input type="checkbox" className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30" {...register('portal_enabled')} />
            Enable parent portal access
          </label>

          {portalEnabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <FormField label="Portal Email" htmlFor="portal_email" error={errors.portal_email}>
                <input id="portal_email" type="email" className={inputClass} {...register('portal_email')} />
              </FormField>
              <FormField
                label={guardian ? 'New Password' : 'Password'}
                htmlFor="portal_password"
                error={errors.portal_password}
                hint={guardian ? 'Leave blank to keep current password.' : undefined}
              >
                <input
                  id="portal_password"
                  type="password"
                  className={inputClass}
                  {...register('portal_password', {
                    required: guardian ? false : 'Password is required when enabling portal access.',
                    minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                  })}
                />
              </FormField>
              <FormField label="Portal Status" htmlFor="portal_status" error={errors.portal_status}>
                <select id="portal_status" className={inputClass} {...register('portal_status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </FormField>
            </div>
          )}
        </div>

        <ModalActions onClose={onClose} isSaving={isSaving} />
      </form>
    </Modal>
  )
}

function ChildrenModal({
  guardian,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  guardian: Guardian
  onClose: () => void
  onSubmit: (students: GuardianStudentPayload[]) => void
  isSaving: boolean
  error: string | null
}) {
  const [childSearch, setChildSearch] = useState('')
  const [drafts, setDrafts] = useState<ChildDraft[]>(() => guardian.students.map(toChildDraft))

  const { data, isLoading } = useQuery({
    queryKey: ['guardian-child-search', childSearch],
    queryFn: () =>
      fetchStudents({
        page: 1,
        per_page: 50,
        search: childSearch.trim() || undefined,
        status: 'active',
      }),
  })

  const addStudent = (student: Student) => {
    if (drafts.some((draft) => draft.student_id === student.id)) return
    setDrafts((current) => [
      ...current,
      {
        student_id: student.id,
        admission_no: student.admission_no,
        full_name: student.full_name,
        class_name: student.class_name,
        section: student.section,
        relationship: guardian.relation ?? '',
        is_primary: current.length === 0,
        is_emergency_contact: current.length === 0,
        pickup_allowed: true,
      },
    ])
  }

  const updateDraft = (studentId: number, patch: Partial<ChildDraft>) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.student_id === studentId
          ? {
              ...draft,
              ...patch,
              is_emergency_contact: patch.is_primary ? true : patch.is_emergency_contact ?? draft.is_emergency_contact,
            }
          : draft,
      ),
    )
  }

  const payload = drafts.map((draft) => ({
    student_id: draft.student_id,
    relationship: optional(draft.relationship),
    is_primary: draft.is_primary,
    is_emergency_contact: draft.is_emergency_contact,
    pickup_allowed: draft.pickup_allowed,
  }))

  return (
    <Modal title={`Linked Children - ${guardian.name}`} description="Attach children and set pickup, primary, and emergency flags." onClose={onClose} size="lg">
      <div className="space-y-4">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <label className="relative block">
          <span className="sr-only">Search students</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={17} height={17} />
          <input
            value={childSearch}
            onChange={(event) => setChildSearch(event.target.value)}
            className={`${inputClass} pl-9`}
            placeholder="Search active students by name or admission no"
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-line bg-paper/35 p-3">
            {isLoading ? (
              <p className="text-[0.85rem] text-ink/45">Loading students...</p>
            ) : (data?.items ?? []).length === 0 ? (
              <p className="text-[0.85rem] text-ink/45">No matching active students.</p>
            ) : (
              <ul className="space-y-2">
                {(data?.items ?? []).map((student) => (
                  <li key={student.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                    <div>
                      <div className="text-[0.84rem] font-semibold text-ink">{student.full_name}</div>
                      <div className="text-[0.73rem] text-ink/45">
                        {student.admission_no ?? 'No admission no'} - {student.class_name ?? 'No class'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addStudent(student)}
                      className="rounded-lg bg-accent px-3 py-1.5 text-[0.75rem] font-semibold text-white disabled:opacity-40"
                      disabled={drafts.some((draft) => draft.student_id === student.id)}
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto rounded-2xl border border-line bg-white p-3">
            {drafts.length === 0 ? (
              <p className="text-[0.85rem] text-ink/45">No children linked.</p>
            ) : (
              <ul className="space-y-3">
                {drafts.map((draft) => (
                  <li key={draft.student_id} className="rounded-xl border border-line bg-paper/35 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[0.86rem] font-semibold text-ink">{draft.full_name}</div>
                        <div className="text-[0.73rem] text-ink/45">
                          {draft.admission_no ?? 'No admission no'} - {draft.class_name ?? 'No class'}
                          {draft.section ? ` / ${draft.section}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDrafts((current) => current.filter((item) => item.student_id !== draft.student_id))}
                        className="text-[0.75rem] font-semibold text-[#dc2626] hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      value={draft.relationship}
                      onChange={(event) => updateDraft(draft.student_id, { relationship: event.target.value })}
                      className={`${inputClass} mt-3`}
                      placeholder="Relationship"
                    />
                    <div className="mt-3 grid gap-2 text-[0.78rem] text-ink/65 sm:grid-cols-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.is_primary}
                          onChange={(event) => updateDraft(draft.student_id, { is_primary: event.target.checked })}
                          className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30"
                        />
                        Primary
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.is_emergency_contact}
                          onChange={(event) => updateDraft(draft.student_id, { is_emergency_contact: event.target.checked })}
                          className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30"
                        />
                        Emergency
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.pickup_allowed}
                          onChange={(event) => updateDraft(draft.student_id, { pickup_allowed: event.target.checked })}
                          className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30"
                        />
                        Pickup
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-accent hover:text-accent">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(payload)}
            disabled={isSaving}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ResetPasswordModal({
  guardian,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  guardian: Guardian
  onClose: () => void
  onSubmit: (password: string) => void
  isSaving: boolean
  error: string | null
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ password: string }>({ defaultValues: { password: '' } })

  return (
    <Modal title={`Reset Password - ${guardian.name}`} description={guardian.portal.email ?? undefined} onClose={onClose}>
      <form onSubmit={handleSubmit((values) => onSubmit(values.password))} className="space-y-4">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}
        <FormField label="New Password" htmlFor="guardian_password" error={errors.password}>
          <input
            id="guardian_password"
            type="password"
            className={inputClass}
            {...register('password', {
              required: 'Password is required.',
              minLength: { value: 8, message: 'Password must be at least 8 characters.' },
            })}
          />
        </FormField>
        <ModalActions onClose={onClose} isSaving={isSaving} />
      </form>
    </Modal>
  )
}

function GuardianProfileModal({ guardian, onClose }: { guardian: Guardian; onClose: () => void }) {
  return (
    <Modal title={guardian.name} description={guardian.relation ?? 'Guardian'} onClose={onClose} size="lg">
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Phone" value={guardian.phone} />
        <Info label="Alternate Phone" value={guardian.alternate_phone} />
        <Info label="Email" value={guardian.email} />
        <Info label="Occupation" value={guardian.occupation} />
        <Info label="Address" value={guardian.address} wide />
        <Info label="Portal" value={guardian.portal.has_login ? `${guardian.portal.email} (${guardian.portal.status})` : 'No portal access'} wide />
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-paper/45 p-4">
        <h3 className="text-[0.85rem] font-bold uppercase tracking-wider text-ink/45">Linked Children</h3>
        {guardian.students.length === 0 ? (
          <p className="mt-3 text-[0.85rem] text-ink/45">No children linked.</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {guardian.students.map((student) => (
              <div key={student.id} className="rounded-xl bg-white px-3 py-2">
                <div className="text-[0.84rem] font-semibold text-ink">{student.full_name}</div>
                <div className="text-[0.73rem] text-ink/45">
                  {student.admission_no ?? 'No admission no'} - {student.class_name ?? 'No class'}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {student.is_primary && <SmallBadge label="Primary" />}
                  {student.is_emergency_contact && <SmallBadge label="Emergency" />}
                  {student.pickup_allowed && <SmallBadge label="Pickup" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function ChildSummary({ students }: { students: GuardianStudentRef[] }) {
  if (students.length === 0) {
    return <span className="text-ink/35">No children</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {students.slice(0, 3).map((student) => (
        <span key={student.id} className="rounded-full bg-paper-2 px-2.5 py-1 text-[0.72rem] font-semibold text-ink/60">
          {student.full_name}
        </span>
      ))}
      {students.length > 3 && (
        <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[0.72rem] font-semibold text-ink/45">
          +{students.length - 3}
        </span>
      )}
    </div>
  )
}

function ModalActions({ onClose, isSaving }: { onClose: () => void; isSaving: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-accent hover:text-accent"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}

function Info({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-line bg-white px-3 py-2.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink/40">{label}</div>
      <div className="mt-1 text-[0.85rem] font-medium text-ink/75">{value || '-'}</div>
    </div>
  )
}

function SmallBadge({ label }: { label: string }) {
  return <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[0.68rem] font-bold text-accent">{label}</span>
}

function GuardianTableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-[360px] rounded-2xl bg-ink/5" />
      <div className="h-14 rounded-2xl bg-ink/5" />
    </div>
  )
}

function GuardianErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-white py-20 text-center">
      <p className="text-ink/70">We could not load guardian records.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2"
      >
        Try again
      </button>
    </div>
  )
}

function toGuardianPayload(values: GuardianFormValues): GuardianPayload {
  return {
    name: String(values.name ?? '').trim(),
    relation: optional(values.relation),
    phone: optional(values.phone),
    alternate_phone: optional(values.alternate_phone),
    email: optional(values.email),
    occupation: optional(values.occupation),
    address: optional(values.address),
    status: optional(values.status) ?? 'active',
    portal_enabled: !!values.portal_enabled,
    portal_email: optional(values.portal_email),
    portal_password: optional(values.portal_password),
    portal_status: optional(values.portal_status),
  }
}

function toChildDraft(student: GuardianStudentRef): ChildDraft {
  return {
    student_id: student.id,
    admission_no: student.admission_no,
    full_name: student.full_name,
    class_name: student.class_name,
    section: student.section,
    relationship: student.relationship ?? '',
    is_primary: student.is_primary,
    is_emergency_contact: student.is_emergency_contact,
    pickup_allowed: student.pickup_allowed,
  }
}

function optional(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

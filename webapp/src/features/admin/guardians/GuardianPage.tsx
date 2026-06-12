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
import { RowAction } from '../components/TableUI'
import {
  ArchiveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  EyeIcon,
  FilterIcon,
  KeyIcon,
  LinkIcon,
  ParentsIcon,
  PlusIcon,
  SearchIcon,
} from '../components/icons'
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
  const { can } = useAuth()
  const canManage = can('guardians.update')
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
        <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ink to-ink-soft px-6 py-6 text-paper shadow-[0_18px_40px_-24px_rgba(19,28,61,.55)]">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-accent/20 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper/10 text-paper ring-1 ring-paper/15 backdrop-blur">
              <ParentsIcon width={24} height={24} />
            </span>
            <div>
              <h1 className="text-[1.7rem] font-extrabold leading-tight tracking-[-0.02em]">Parents &amp; Guardians</h1>
              <p className="mt-1 text-[0.9rem] text-paper/65">Parent contact and portal access records.</p>
            </div>
          </div>
        </div>
        <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink/5 text-ink/40">
            <KeyIcon width={28} height={28} />
          </span>
          <h3 className="mt-4 text-[1.05rem] font-bold text-ink">Access restricted</h3>
          <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
            You do not have permission to view parent and guardian contact records. Contact your school admin or
            principal.
          </p>
        </div>
      </div>
    )
  }

  const guardians = data?.items ?? []
  const meta = data?.meta

  const activeFilters = [search, status, portalStatus].filter(Boolean).length
  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setPortalStatus('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header band */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ink to-ink-soft px-6 py-6 text-paper shadow-[0_18px_40px_-24px_rgba(19,28,61,.55)]">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-accent/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-lime/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper/10 text-paper ring-1 ring-paper/15 backdrop-blur">
              <ParentsIcon width={24} height={24} />
            </span>
            <div>
              <h1 className="text-[1.7rem] font-extrabold leading-tight tracking-[-0.02em]">Parents &amp; Guardians</h1>
              <p className="mt-1 max-w-xl text-[0.9rem] text-paper/65">
                Manage parent contacts, child links, pickup permissions, and parent portal access.
              </p>
              {meta && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1 text-[0.78rem] font-semibold text-paper ring-1 ring-paper/15">
                  <span className="text-lime">{meta.total}</span>
                  {meta.total === 1 ? 'guardian' : 'guardians'}
                  {activeFilters > 0 && <span className="text-paper/55">· filtered</span>}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setGuardianModal('new')}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
          >
            <PlusIcon width={17} height={17} />
            Add Guardian
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
            <FilterIcon width={16} height={16} className="text-accent" />
            Filters
            {activeFilters > 0 && (
              <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[0.7rem] font-bold text-accent">
                {activeFilters} active
              </span>
            )}
          </div>
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[0.78rem] font-semibold text-ink/45 transition hover:text-accent"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(2,minmax(0,200px))]">
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
        </div>
      </div>

      {isLoading ? (
        <GuardianTableSkeleton />
      ) : isError ? (
        <GuardianErrorState onRetry={() => refetch()} />
      ) : guardians.length === 0 ? (
        <GuardianEmptyState hasFilters={activeFilters > 0} onReset={resetFilters} onAdd={() => setGuardianModal('new')} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full min-w-[980px] text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">Guardian</th>
                  <th className="px-4 py-3.5 font-bold">Contact</th>
                  <th className="px-4 py-3.5 font-bold">Children</th>
                  <th className="px-4 py-3.5 font-bold">Portal</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {guardians.map((guardian) => (
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
                ))}
              </tbody>
            </table>
          </div>

          {meta && (
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-[0.84rem] text-ink/55 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing <span className="font-semibold text-ink/75">{meta.from ?? 0}–{meta.to ?? 0}</span> of{' '}
                <span className="font-semibold text-ink/75">{meta.total}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink/65"
                >
                  <ChevronLeftIcon width={16} height={16} />
                  Prev
                </button>
                <span className="px-2 text-[0.8rem] font-semibold text-ink/45">
                  {meta.current_page} / {meta.last_page}
                </span>
                <button
                  type="button"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((current) => Math.min(current + 1, meta.last_page))}
                  className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink/65"
                >
                  Next
                  <ChevronRightIcon width={16} height={16} />
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
    <tr className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-paper-2 to-paper text-[0.82rem] font-bold text-ink/60 ring-1 ring-line transition group-hover:ring-accent/30">
            {initials(guardian.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">{guardian.name}</div>
            <div className="mt-0.5 text-[0.76rem] text-ink/45">{guardian.relation ?? 'Guardian'}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-ink/65">
        <div className="truncate">{guardian.phone ?? '—'}</div>
        <div className="mt-0.5 truncate text-[0.76rem] text-ink/45">{guardian.email ?? '—'}</div>
      </td>
      <td className="px-4 py-3">
        <ChildSummary students={guardian.students} />
      </td>
      <td className="px-4 py-3">
        {guardian.portal.has_login ? <StatusBadge status={guardian.portal.status ?? 'inactive'} /> : <span className="text-[0.78rem] text-ink/35">No portal</span>}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={guardian.status} />
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
          <RowAction label="View profile" onClick={onView}>
            <EyeIcon width={17} height={17} />
          </RowAction>
          <RowAction label="Linked children" onClick={onChildren}>
            <LinkIcon width={17} height={17} />
          </RowAction>
          <RowAction
            label={guardian.portal.has_login ? 'Reset password' : 'No portal login'}
            onClick={onReset}
            disabled={!guardian.portal.has_login}
          >
            <KeyIcon width={17} height={17} />
          </RowAction>
          <RowAction label="Edit" onClick={onEdit}>
            <EditIcon width={17} height={17} />
          </RowAction>
          <RowAction label="Archive" onClick={onArchive} danger>
            <ArchiveIcon width={17} height={17} />
          </RowAction>
        </div>
      </td>
    </tr>
  )
}

function GuardianEmptyState({
  hasFilters,
  onReset,
  onAdd,
}: {
  hasFilters: boolean
  onReset: () => void
  onAdd: () => void
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
        <ParentsIcon width={30} height={30} />
      </span>
      <h3 className="mt-4 text-[1.05rem] font-bold text-ink">
        {hasFilters ? 'No guardians match these filters' : 'No guardians yet'}
      </h3>
      <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
        {hasFilters
          ? 'Try adjusting or clearing the filters to see more results.'
          : 'Add a parent or guardian to link children and grant parent portal access.'}
      </p>
      <div className="mt-5 flex gap-2.5">
        {hasFilters ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
          >
            Clear filters
          </button>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
          >
            <PlusIcon width={17} height={17} />
            Add Guardian
          </button>
        )}
      </div>
    </div>
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
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="border-b border-line bg-paper/60 px-5 py-3.5">
          <div className="h-3 w-24 animate-pulse rounded bg-ink/10" />
        </div>
        <div className="divide-y divide-line/60">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-3.5">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-ink/[0.07]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-36 animate-pulse rounded bg-ink/[0.08]" />
                <div className="h-2.5 w-20 animate-pulse rounded bg-ink/[0.05]" />
              </div>
              <div className="hidden h-6 w-24 animate-pulse rounded-full bg-ink/[0.06] sm:block" />
              <div className="hidden h-6 w-16 animate-pulse rounded-full bg-ink/[0.06] md:block" />
              <div className="h-8 w-28 animate-pulse rounded-lg bg-ink/[0.05]" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-14 animate-pulse rounded-2xl bg-ink/[0.05]" />
    </div>
  )
}

function GuardianErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-white py-20 text-center shadow-sm">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#dc2626]/10 text-[#dc2626]">
        <ArchiveIcon width={26} height={26} />
      </span>
      <p className="mt-4 font-semibold text-ink/75">We couldn’t load guardian records.</p>
      <p className="mt-1 text-[0.85rem] text-ink/50">Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
      >
        Try again
      </button>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
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

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchAcademicSessions, fetchClasses } from '@/features/admin/academic-setup/api'
import type { AcademicSession, SchoolClass } from '@/features/admin/academic-setup/types'
import { assignStudentFee, fetchFeeStructures } from '@/features/admin/fees/api'
import type { AssignFeePayload, DiscountType } from '@/features/admin/fees/types'
import { extractErrorMessage } from '@/lib/errors'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { RowAction } from '../components/TableUI'
import {
  ArchiveIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  EditIcon,
  EyeIcon,
  FilterIcon,
  GraduationIcon,
  PlusIcon,
  SearchIcon,
  TransferIcon,
  UploadIcon,
  UsersGroupIcon,
} from '../components/icons'
import {
  archiveStudent,
  createStudent,
  exportStudents,
  fetchStudentHistory,
  fetchStudents,
  promoteStudents,
  transferStudent,
  updateStudent,
  uploadStudentPhoto,
} from './api'
import type {
  PromoteStudentsPayload,
  Student,
  StudentListParams,
  StudentPayload,
  TransferStudentPayload,
} from './types'

const PER_PAGE = 12

type StudentFormValues = Record<string, string | boolean | undefined> & {
  pickup_allowed?: boolean
}

type TransferFormValues = {
  transfer_type: 'internal' | 'outgoing'
  academic_session_id: string
  class_id: string
  section_id: string
  roll_no: string
  transfer_date: string
  transfer_reason: string
}

type PromoteFormValues = {
  from_academic_session_id: string
  to_academic_session_id: string
  from_class_id: string
  from_section_id: string
  to_class_id: string
  to_section_id: string
}

export default function StudentPage() {
  const { can } = useAuth()
  const canEdit = can('students.update')
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '')
  const [status, setStatus] = useState('')
  const [gender, setGender] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [studentModal, setStudentModal] = useState<Student | 'new' | null>(null)
  const [profileModal, setProfileModal] = useState<Student | null>(null)
  const [transferModal, setTransferModal] = useState<Student | null>(null)
  const [photoModal, setPhotoModal] = useState<Student | null>(null)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const params: StudentListParams = {
    page,
    per_page: PER_PAGE,
    search: search.trim() || undefined,
    academic_session_id: sessionId || undefined,
    class_id: classId || undefined,
    section_id: sectionId || undefined,
    status: status || undefined,
    gender: gender || undefined,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['students', params],
    queryFn: () => fetchStudents(params),
  })
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: fetchClasses })
  const { data: sessions = [] } = useQuery({ queryKey: ['academic-sessions'], queryFn: fetchAcademicSessions })

  const filteredSections = useMemo(
    () => classes.find((schoolClass) => String(schoolClass.id) === classId)?.sections ?? [],
    [classes, classId],
  )

  const invalidateStudents = () => queryClient.invalidateQueries({ queryKey: ['students'] })

  const saveMutation = useMutation({
    mutationFn: async (vars: { id?: number; payload: StudentPayload; feePlan?: AssignFeePayload | null }) => {
      const saved = vars.id ? await updateStudent(vars.id, vars.payload) : await createStudent(vars.payload)
      // Optionally assign a fee plan in the same flow (admission). Backend
      // generates invoices and cancels any prior unpaid plan for the session.
      if (vars.feePlan) {
        await assignStudentFee(saved.id, vars.feePlan)
      }
      return saved
    },
    onSuccess: () => {
      invalidateStudents()
      queryClient.invalidateQueries({ queryKey: ['fee-students'] })
      setStudentModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const archiveMutation = useMutation({
    mutationFn: archiveStudent,
    onSuccess: invalidateStudents,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const transferMutation = useMutation({
    mutationFn: (vars: { id: number; payload: TransferStudentPayload }) => transferStudent(vars.id, vars.payload),
    onSuccess: () => {
      invalidateStudents()
      setTransferModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const promoteMutation = useMutation({
    mutationFn: promoteStudents,
    onSuccess: () => {
      invalidateStudents()
      setPromoteOpen(false)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const photoMutation = useMutation({
    mutationFn: (vars: { id: number; file: File }) => uploadStudentPhoto(vars.id, vars.file),
    onSuccess: () => {
      invalidateStudents()
      setPhotoModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const exportMutation = useMutation({
    mutationFn: () =>
      exportStudents({
        search: search.trim() || undefined,
        academic_session_id: sessionId || undefined,
        class_id: classId || undefined,
        section_id: sectionId || undefined,
        status: status || undefined,
        gender: gender || undefined,
      }),
    onSuccess: (blob) => downloadBlob(blob, 'students.csv'),
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const students = data?.items ?? []
  const meta = data?.meta

  const activeFilters = [search, status, gender, sessionId, classId, sectionId].filter(Boolean).length
  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setGender('')
    setSessionId('')
    setClassId('')
    setSectionId('')
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
              <UsersGroupIcon width={24} height={24} />
            </span>
            <div>
              <h1 className="text-[1.7rem] font-extrabold leading-tight tracking-[-0.02em]">Students</h1>
              <p className="mt-1 max-w-xl text-[0.9rem] text-paper/65">
                Manage admissions, class placement, guardians, medical notes, transfers, and promotions.
              </p>
              {meta && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1 text-[0.78rem] font-semibold text-paper ring-1 ring-paper/15">
                  <span className="text-lime">{meta.total}</span>
                  {meta.total === 1 ? 'student' : 'students'}
                  {activeFilters > 0 && <span className="text-paper/55">· filtered</span>}
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-paper/20 bg-paper/5 px-4 py-2.5 text-sm font-semibold text-paper/90 transition hover:bg-paper/15 hover:shadow-lg disabled:opacity-60"
              >
                <DownloadIcon width={17} height={17} />
                {exportMutation.isPending ? 'Exporting…' : 'Export'}
              </button>
              <button
                type="button"
                onClick={() => setPromoteOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-paper/20 bg-paper/5 px-4 py-2.5 text-sm font-semibold text-paper/90 transition hover:bg-paper/15 hover:shadow-lg"
              >
                <GraduationIcon width={17} height={17} />
                Promote
              </button>
              <button
                type="button"
                onClick={() => setStudentModal('new')}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
              >
                <PlusIcon width={17} height={17} />
                Add Student
              </button>
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          You have read-only access to students. Contact your school admin or principal to make changes.
        </div>
      )}

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
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(0,1fr))]">
          <label className="relative">
            <span className="sr-only">Search students</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={17} height={17} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className={`${inputClass} pl-9`}
              placeholder="Search name, admission, roll, guardian"
            />
          </label>

          <select value={sessionId} onChange={(event) => setFilter(setSessionId, event.target.value, setPage)} className={inputClass} aria-label="Academic session">
            <option value="">All sessions</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>

          <select
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value)
              setSectionId('')
              setPage(1)
            }}
            className={inputClass}
            aria-label="Class"
          >
            <option value="">All classes</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </select>

          <select value={sectionId} onChange={(event) => setFilter(setSectionId, event.target.value, setPage)} className={inputClass} aria-label="Section">
            <option value="">All sections</option>
            {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                Section {section.name}
              </option>
            ))}
          </select>

          <select value={status} onChange={(event) => setFilter(setStatus, event.target.value, setPage)} className={inputClass} aria-label="Status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
            <option value="transferred">Transferred</option>
            <option value="alumni">Alumni</option>
          </select>

          <select value={gender} onChange={(event) => setFilter(setGender, event.target.value, setPage)} className={inputClass} aria-label="Gender">
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <StudentTableSkeleton />
      ) : isError ? (
        <StudentErrorState onRetry={() => refetch()} />
      ) : students.length === 0 ? (
        <StudentEmptyState canEdit={canEdit} hasFilters={activeFilters > 0} onReset={resetFilters} onAdd={() => setStudentModal('new')} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full min-w-[1080px] text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">Student</th>
                  <th className="px-4 py-3.5 font-bold">Class</th>
                  <th className="px-4 py-3.5 font-bold">Guardian</th>
                  <th className="px-4 py-3.5 font-bold">Contact</th>
                  <th className="px-4 py-3.5 font-bold">Health</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    canEdit={canEdit}
                    onView={() => setProfileModal(student)}
                    onEdit={() => setStudentModal(student)}
                    onTransfer={() => setTransferModal(student)}
                    onPhoto={() => setPhotoModal(student)}
                    onArchive={() => {
                      if (window.confirm(`Archive ${student.full_name}?`)) {
                        archiveMutation.mutate(student.id)
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

      {studentModal && (
        <StudentFormModal
          student={studentModal === 'new' ? null : studentModal}
          classes={classes}
          sessions={sessions}
          onClose={() => {
            setStudentModal(null)
            setModalError(null)
          }}
          onSubmit={(payload, feePlan) =>
            saveMutation.mutate({ id: studentModal === 'new' ? undefined : studentModal.id, payload, feePlan })
          }
          isSaving={saveMutation.isPending}
          error={modalError}
        />
      )}

      {profileModal && <StudentProfileModal student={profileModal} onClose={() => setProfileModal(null)} />}

      {transferModal && (
        <TransferModal
          student={transferModal}
          classes={classes}
          sessions={sessions}
          onClose={() => {
            setTransferModal(null)
            setModalError(null)
          }}
          onSubmit={(payload) => transferMutation.mutate({ id: transferModal.id, payload })}
          isSaving={transferMutation.isPending}
          error={modalError}
        />
      )}

      {photoModal && (
        <PhotoModal
          student={photoModal}
          onClose={() => {
            setPhotoModal(null)
            setModalError(null)
          }}
          onSubmit={(file) => photoMutation.mutate({ id: photoModal.id, file })}
          isSaving={photoMutation.isPending}
          error={modalError}
        />
      )}

      {promoteOpen && (
        <PromoteModal
          classes={classes}
          sessions={sessions}
          onClose={() => {
            setPromoteOpen(false)
            setModalError(null)
          }}
          onSubmit={(payload) => promoteMutation.mutate(payload)}
          isSaving={promoteMutation.isPending}
          error={modalError}
        />
      )}
    </div>
  )
}

function StudentRow({
  student,
  canEdit,
  onView,
  onEdit,
  onTransfer,
  onPhoto,
  onArchive,
}: {
  student: Student
  canEdit: boolean
  onView: () => void
  onEdit: () => void
  onTransfer: () => void
  onPhoto: () => void
  onArchive: () => void
}) {
  return (
    <tr className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-paper-2 to-paper text-[0.82rem] font-bold text-ink/60 ring-1 ring-line transition group-hover:ring-accent/30">
            {student.photo_url ? <img src={student.photo_url} alt="" className="h-full w-full object-cover" /> : initials(student.full_name)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">{student.full_name}</div>
            <div className="mt-0.5 text-[0.76rem] text-ink/45">{student.admission_no ?? 'No admission no'}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-ink/65">
        <div className="font-medium text-ink/75">{student.class_name ?? '—'}</div>
        <div className="mt-0.5 text-[0.76rem] text-ink/45">
          {student.section ? `Section ${student.section}` : 'No section'} {student.roll_no ? `· Roll ${student.roll_no}` : ''}
        </div>
      </td>
      <td className="px-4 py-3 text-ink/65">
        <div className="truncate">{student.guardian_name ?? student.guardians[0]?.name ?? '—'}</div>
        <div className="mt-0.5 text-[0.76rem] text-ink/45">{student.guardian_phone ?? student.guardians[0]?.phone ?? '—'}</div>
      </td>
      <td className="px-4 py-3 text-ink/65">
        <div className="truncate">{student.primary_phone ?? '—'}</div>
        <div className="mt-0.5 truncate text-[0.76rem] text-ink/45">{student.primary_email ?? '—'}</div>
      </td>
      <td className="px-4 py-3 text-ink/65">
        {student.medical_conditions || student.allergies ? (
          <div>
            <div className="font-medium text-ink/70">{student.blood_group ?? 'Group n/a'}</div>
            <div className="mt-0.5 text-[0.76rem] text-[#dc2626]">{student.allergies ?? student.medical_conditions}</div>
          </div>
        ) : (
          <span className="text-ink/35">{student.blood_group ?? 'No notes'}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={student.status} />
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
          <RowAction label="View profile" onClick={onView}>
            <EyeIcon width={17} height={17} />
          </RowAction>
          {canEdit && (
            <>
              <RowAction label="Upload photo" onClick={onPhoto}>
                <CameraIcon width={17} height={17} />
              </RowAction>
              <RowAction label="Transfer" onClick={onTransfer}>
                <TransferIcon width={17} height={17} />
              </RowAction>
              <RowAction label="Edit" onClick={onEdit}>
                <EditIcon width={17} height={17} />
              </RowAction>
              <RowAction label="Archive" onClick={onArchive} danger>
                <ArchiveIcon width={17} height={17} />
              </RowAction>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

function StudentEmptyState({
  canEdit,
  hasFilters,
  onReset,
  onAdd,
}: {
  canEdit: boolean
  hasFilters: boolean
  onReset: () => void
  onAdd: () => void
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
        <UsersGroupIcon width={30} height={30} />
      </span>
      <h3 className="mt-4 text-[1.05rem] font-bold text-ink">
        {hasFilters ? 'No students match these filters' : 'No students yet'}
      </h3>
      <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
        {hasFilters
          ? 'Try adjusting or clearing the filters to see more results.'
          : 'Add your first student to start managing admissions and class placement.'}
      </p>
      <div className="mt-5 flex gap-2.5">
        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
          >
            Clear filters
          </button>
        )}
        {canEdit && !hasFilters && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
          >
            <PlusIcon width={17} height={17} />
            Add Student
          </button>
        )}
      </div>
    </div>
  )
}

function StudentFormModal({
  student,
  classes,
  sessions,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  student: Student | null
  classes: SchoolClass[]
  sessions: AcademicSession[]
  onClose: () => void
  onSubmit: (payload: StudentPayload, feePlan: AssignFeePayload | null) => void
  isSaving: boolean
  error: string | null
}) {
  const primaryGuardian = student?.guardians.find((guardian) => guardian.is_primary) ?? student?.guardians[0]
  const [feeStructureId, setFeeStructureId] = useState('')
  const [feeDiscountType, setFeeDiscountType] = useState<DiscountType>('none')
  const [feeDiscountValue, setFeeDiscountValue] = useState('')
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormValues>({
    defaultValues: student
      ? {
          academic_session_id: idValue(student.academic_session_id),
          admission_no: student.admission_no ?? '',
          admission_type: student.admission_type ?? 'regular',
          first_name: student.first_name,
          middle_name: student.middle_name ?? '',
          last_name: student.last_name ?? '',
          gender: student.gender ?? '',
          date_of_birth: student.date_of_birth ?? '',
          class_id: idValue(student.class_id),
          section_id: idValue(student.section_id),
          roll_no: student.roll_no ?? '',
          house: student.house ?? '',
          category: student.category ?? '',
          religion: student.religion ?? '',
          blood_group: student.blood_group ?? '',
          nationality: student.nationality ?? '',
          mother_tongue: student.mother_tongue ?? '',
          primary_phone: student.primary_phone ?? '',
          primary_email: student.primary_email ?? '',
          current_address: student.current_address ?? '',
          permanent_address: student.permanent_address ?? '',
          city: student.city ?? '',
          state: student.state ?? '',
          postal_code: student.postal_code ?? '',
          country: student.country ?? '',
          guardian_id: primaryGuardian?.id ? String(primaryGuardian.id) : '',
          guardian_name: primaryGuardian?.name ?? student.guardian_name ?? '',
          guardian_relation: primaryGuardian?.relation ?? '',
          guardian_phone: primaryGuardian?.phone ?? student.guardian_phone ?? '',
          guardian_email: primaryGuardian?.email ?? '',
          guardian_occupation: primaryGuardian?.occupation ?? '',
          guardian_address: primaryGuardian?.address ?? '',
          pickup_allowed: primaryGuardian?.pickup_allowed ?? true,
          emergency_contact_name: student.emergency_contact_name ?? '',
          emergency_contact_relation: student.emergency_contact_relation ?? '',
          emergency_contact_phone: student.emergency_contact_phone ?? '',
          medical_conditions: student.medical_conditions ?? '',
          allergies: student.allergies ?? '',
          medications: student.medications ?? '',
          doctor_name: student.doctor_name ?? '',
          doctor_phone: student.doctor_phone ?? '',
          previous_school_name: student.previous_school_name ?? '',
          previous_school_board: student.previous_school_board ?? '',
          previous_school_class: student.previous_school_class ?? '',
          previous_school_transfer_certificate_no: student.previous_school_transfer_certificate_no ?? '',
          status: student.status,
          admission_date: student.admission_date ?? '',
        }
      : {
          academic_session_id: '',
          admission_no: '',
          admission_type: 'regular',
          first_name: '',
          middle_name: '',
          last_name: '',
          gender: '',
          date_of_birth: '',
          class_id: '',
          section_id: '',
          roll_no: '',
          house: '',
          category: '',
          religion: '',
          blood_group: '',
          nationality: 'Indian',
          mother_tongue: '',
          primary_phone: '',
          primary_email: '',
          current_address: '',
          permanent_address: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'India',
          guardian_id: '',
          guardian_name: '',
          guardian_relation: 'Father',
          guardian_phone: '',
          guardian_email: '',
          guardian_occupation: '',
          guardian_address: '',
          pickup_allowed: true,
          emergency_contact_name: '',
          emergency_contact_relation: '',
          emergency_contact_phone: '',
          medical_conditions: '',
          allergies: '',
          medications: '',
          doctor_name: '',
          doctor_phone: '',
          previous_school_name: '',
          previous_school_board: '',
          previous_school_class: '',
          previous_school_transfer_certificate_no: '',
          status: 'active',
          admission_date: '',
        },
  })

  const selectedClassId = watch('class_id')
  const sections = classes.find((schoolClass) => String(schoolClass.id) === selectedClassId)?.sections ?? []

  const { data: feeStructures = [] } = useQuery({
    queryKey: ['fee-structures', { for: 'student-modal' }],
    queryFn: () => fetchFeeStructures({ status: 'active' }),
  })
  // Show structures for the chosen class (or school-wide structures).
  const eligibleStructures = feeStructures.filter(
    (structure) => !structure.class_id || String(structure.class_id) === selectedClassId,
  )

  const buildFeePlan = (): AssignFeePayload | null => {
    if (!feeStructureId) return null
    return {
      fee_structure_id: Number(feeStructureId),
      discount_type: feeDiscountType,
      discount_value: feeDiscountType === 'none' ? undefined : Number(feeDiscountValue || 0),
    }
  }

  return (
    <Modal title={student ? 'Edit Student' : 'Add Student'} description="Admission, profile, guardian, and health details." onClose={onClose} size="lg">
      <form onSubmit={handleSubmit((values) => onSubmit(toStudentPayload(values), buildFeePlan()))} className="space-y-5">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <FormSection title="Admission">
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Admission No" htmlFor="admission_no" error={errors.admission_no}>
              <input id="admission_no" className={inputClass} {...register('admission_no')} />
            </FormField>
            <FormField label="Admission Type" htmlFor="admission_type" error={errors.admission_type}>
              <select id="admission_type" className={inputClass} {...register('admission_type')}>
                <option value="regular">Regular</option>
                <option value="transfer">Transfer</option>
                <option value="online">Online</option>
                <option value="walk_in">Walk-in</option>
              </select>
            </FormField>
            <FormField label="Admission Date" htmlFor="admission_date" error={errors.admission_date}>
              <input id="admission_date" type="date" className={inputClass} {...register('admission_date')} />
            </FormField>
            <FormField label="Status" htmlFor="student_status" error={errors.status}>
              <select id="student_status" className={inputClass} {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
                <option value="transferred">Transferred</option>
                <option value="alumni">Alumni</option>
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Academic Session" htmlFor="academic_session_id" error={errors.academic_session_id}>
              <select id="academic_session_id" className={inputClass} {...register('academic_session_id')}>
                <option value="">Not set</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Class" htmlFor="class_id" error={errors.class_id}>
              <select
                id="class_id"
                className={inputClass}
                {...register('class_id', {
                  onChange: () => setValue('section_id', ''),
                })}
              >
                <option value="">Not set</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Section" htmlFor="section_id" error={errors.section_id}>
              <select id="section_id" className={inputClass} {...register('section_id')}>
                <option value="">Not set</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    Section {section.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Roll No" htmlFor="roll_no" error={errors.roll_no}>
              <input id="roll_no" className={inputClass} {...register('roll_no')} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Student Profile">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="First Name" htmlFor="first_name" error={errors.first_name}>
              <input id="first_name" className={inputClass} {...register('first_name', { required: 'First name is required.' })} />
            </FormField>
            <FormField label="Middle Name" htmlFor="middle_name" error={errors.middle_name}>
              <input id="middle_name" className={inputClass} {...register('middle_name')} />
            </FormField>
            <FormField label="Last Name" htmlFor="last_name" error={errors.last_name}>
              <input id="last_name" className={inputClass} {...register('last_name')} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Gender" htmlFor="gender" error={errors.gender}>
              <select id="gender" className={inputClass} {...register('gender')}>
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </FormField>
            <FormField label="Date of Birth" htmlFor="date_of_birth" error={errors.date_of_birth}>
              <input id="date_of_birth" type="date" className={inputClass} {...register('date_of_birth')} />
            </FormField>
            <FormField label="House" htmlFor="house" error={errors.house}>
              <input id="house" className={inputClass} {...register('house')} />
            </FormField>
            <FormField label="Category" htmlFor="category" error={errors.category}>
              <input id="category" className={inputClass} {...register('category')} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Contact & Address">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Primary Phone" htmlFor="primary_phone" error={errors.primary_phone}>
              <input id="primary_phone" className={inputClass} {...register('primary_phone')} />
            </FormField>
            <FormField label="Primary Email" htmlFor="primary_email" error={errors.primary_email}>
              <input id="primary_email" type="email" className={inputClass} {...register('primary_email')} />
            </FormField>
            <FormField label="Nationality" htmlFor="nationality" error={errors.nationality}>
              <input id="nationality" className={inputClass} {...register('nationality')} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Current Address" htmlFor="current_address" error={errors.current_address}>
              <textarea id="current_address" rows={2} className={inputClass} {...register('current_address')} />
            </FormField>
            <FormField label="Permanent Address" htmlFor="permanent_address" error={errors.permanent_address}>
              <textarea id="permanent_address" rows={2} className={inputClass} {...register('permanent_address')} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Primary Guardian">
          <input type="hidden" {...register('guardian_id')} />
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Guardian Name" htmlFor="guardian_name" error={errors.guardian_name}>
              <input id="guardian_name" className={inputClass} {...register('guardian_name')} />
            </FormField>
            <FormField label="Relation" htmlFor="guardian_relation" error={errors.guardian_relation}>
              <input id="guardian_relation" className={inputClass} {...register('guardian_relation')} />
            </FormField>
            <FormField label="Guardian Phone" htmlFor="guardian_phone" error={errors.guardian_phone}>
              <input id="guardian_phone" className={inputClass} {...register('guardian_phone')} />
            </FormField>
            <FormField label="Guardian Email" htmlFor="guardian_email" error={errors.guardian_email}>
              <input id="guardian_email" type="email" className={inputClass} {...register('guardian_email')} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Occupation" htmlFor="guardian_occupation" error={errors.guardian_occupation}>
              <input id="guardian_occupation" className={inputClass} {...register('guardian_occupation')} />
            </FormField>
            <FormField label="Emergency Contact" htmlFor="emergency_contact_name" error={errors.emergency_contact_name}>
              <input id="emergency_contact_name" className={inputClass} {...register('emergency_contact_name')} />
            </FormField>
            <FormField label="Emergency Phone" htmlFor="emergency_contact_phone" error={errors.emergency_contact_phone}>
              <input id="emergency_contact_phone" className={inputClass} {...register('emergency_contact_phone')} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Medical & Previous School">
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Blood Group" htmlFor="blood_group" error={errors.blood_group}>
              <select id="blood_group" className={inputClass} {...register('blood_group')}>
                <option value="">Not set</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Medical Conditions" htmlFor="medical_conditions" error={errors.medical_conditions}>
              <input id="medical_conditions" className={inputClass} {...register('medical_conditions')} />
            </FormField>
            <FormField label="Allergies" htmlFor="allergies" error={errors.allergies}>
              <input id="allergies" className={inputClass} {...register('allergies')} />
            </FormField>
            <FormField label="Doctor Phone" htmlFor="doctor_phone" error={errors.doctor_phone}>
              <input id="doctor_phone" className={inputClass} {...register('doctor_phone')} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Previous School" htmlFor="previous_school_name" error={errors.previous_school_name}>
              <input id="previous_school_name" className={inputClass} {...register('previous_school_name')} />
            </FormField>
            <FormField label="Previous Board" htmlFor="previous_school_board" error={errors.previous_school_board}>
              <input id="previous_school_board" className={inputClass} {...register('previous_school_board')} />
            </FormField>
            <FormField label="Previous Class" htmlFor="previous_school_class" error={errors.previous_school_class}>
              <input id="previous_school_class" className={inputClass} {...register('previous_school_class')} />
            </FormField>
            <FormField label="TC No" htmlFor="previous_school_transfer_certificate_no" error={errors.previous_school_transfer_certificate_no}>
              <input id="previous_school_transfer_certificate_no" className={inputClass} {...register('previous_school_transfer_certificate_no')} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Fee Plan (optional)">
          {!selectedClassId ? (
            <p className="text-[0.84rem] text-ink/50">Select a class above to choose a fee structure.</p>
          ) : eligibleStructures.length === 0 ? (
            <p className="text-[0.84rem] text-ink/50">
              No fee structure exists for this class yet. Create one under Fees → Fee Structures, then assign it here or
              from the Fees page.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Fee Structure" htmlFor="fee_structure_id">
                  <select
                    id="fee_structure_id"
                    className={inputClass}
                    value={feeStructureId}
                    onChange={(event) => setFeeStructureId(event.target.value)}
                  >
                    <option value="">
                      {student ? 'Keep current plan' : 'No plan'}
                    </option>
                    {eligibleStructures.map((structure) => (
                      <option key={structure.id} value={structure.id}>
                        {structure.name}
                        {structure.class?.name ? ` · ${structure.class.name}` : ' · School-wide'}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Discount" htmlFor="fee_discount_type">
                  <select
                    id="fee_discount_type"
                    className={inputClass}
                    value={feeDiscountType}
                    onChange={(event) => setFeeDiscountType(event.target.value as DiscountType)}
                    disabled={!feeStructureId}
                  >
                    <option value="none">No discount</option>
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed (per occurrence)</option>
                  </select>
                </FormField>
                <FormField label="Discount Value" htmlFor="fee_discount_value">
                  <input
                    id="fee_discount_value"
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={feeDiscountValue}
                    onChange={(event) => setFeeDiscountValue(event.target.value)}
                    disabled={feeDiscountType === 'none' || !feeStructureId}
                    placeholder={feeDiscountType === 'percent' ? 'e.g. 10' : 'Amount'}
                  />
                </FormField>
              </div>
              {feeStructureId && (
                <p className="text-[0.74rem] text-ink/45">
                  On save, this plan is assigned and instalment invoices are generated
                  {student ? '. Any existing unpaid plan for this session is replaced.' : '.'}
                </p>
              )}
            </>
          )}
        </FormSection>

        <ModalActions onClose={onClose} isSaving={isSaving} />
      </form>
    </Modal>
  )
}

function StudentProfileModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['student-history', student.id],
    queryFn: () => fetchStudentHistory(student.id),
  })

  return (
    <Modal title={student.full_name} description={`${student.admission_no ?? 'No admission no'} - ${student.class_name ?? 'No class'}`} onClose={onClose} size="lg">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl bg-paper-2 text-3xl font-bold text-ink/45">
            {student.photo_url ? <img src={student.photo_url} alt="" className="h-full w-full object-cover" /> : initials(student.full_name)}
          </div>
          <StatusBadge status={student.status} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Class" value={student.class_name ? `${student.class_name}${student.section ? ` - ${student.section}` : ''}` : null} />
          <Info label="Roll No" value={student.roll_no} />
          <Info label="Gender" value={titleize(student.gender ?? '')} />
          <Info label="Date of Birth" value={student.date_of_birth} />
          <Info label="Guardian" value={student.guardian_name ?? student.guardians[0]?.name} />
          <Info label="Guardian Phone" value={student.guardian_phone ?? student.guardians[0]?.phone} />
          <Info label="Address" value={student.current_address} wide />
          <Info label="Medical" value={[student.blood_group, student.medical_conditions, student.allergies].filter(Boolean).join(' / ')} wide />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-paper/45 p-4">
        <h3 className="text-[0.85rem] font-bold uppercase tracking-wider text-ink/45">Recent History</h3>
        {isLoading ? (
          <p className="mt-3 text-[0.85rem] text-ink/45">Loading history...</p>
        ) : (history ?? []).length === 0 ? (
          <p className="mt-3 text-[0.85rem] text-ink/45">No history yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(history ?? []).slice(0, 8).map((item) => (
              <li key={item.id} className="rounded-xl bg-white px-3 py-2 text-[0.82rem] text-ink/65">
                <span className="font-semibold text-ink">{item.action.replaceAll('_', ' ')}</span>
                <span className="ml-2 text-ink/40">{item.user?.name ?? 'System'} - {item.created_at ? new Date(item.created_at).toLocaleString() : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function TransferModal({
  student,
  classes,
  sessions,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  student: Student
  classes: SchoolClass[]
  sessions: AcademicSession[]
  onClose: () => void
  onSubmit: (payload: TransferStudentPayload) => void
  isSaving: boolean
  error: string | null
}) {
  const { register, handleSubmit, watch, setValue } = useForm<TransferFormValues>({
    defaultValues: {
      transfer_type: 'internal',
      academic_session_id: idValue(student.academic_session_id),
      class_id: idValue(student.class_id),
      section_id: idValue(student.section_id),
      roll_no: student.roll_no ?? '',
      transfer_date: new Date().toISOString().slice(0, 10),
      transfer_reason: '',
    },
  })
  const transferType = watch('transfer_type')
  const selectedClassId = watch('class_id')
  const sections = classes.find((schoolClass) => String(schoolClass.id) === selectedClassId)?.sections ?? []

  return (
    <Modal title={`Transfer ${student.full_name}`} description="Move internally or mark as transferred out." onClose={onClose}>
      <form onSubmit={handleSubmit((values) => onSubmit(toTransferPayload(values)))} className="space-y-4">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}
        <FormField label="Transfer Type" htmlFor="transfer_type">
          <select id="transfer_type" className={inputClass} {...register('transfer_type')}>
            <option value="internal">Internal class transfer</option>
            <option value="outgoing">Transferred out</option>
          </select>
        </FormField>
        {transferType === 'internal' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Session" htmlFor="transfer_session">
              <select id="transfer_session" className={inputClass} {...register('academic_session_id')}>
                <option value="">Keep current</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>{session.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Class" htmlFor="transfer_class">
              <select
                id="transfer_class"
                className={inputClass}
                {...register('class_id', { onChange: () => setValue('section_id', '') })}
              >
                <option value="">Select class</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Section" htmlFor="transfer_section">
              <select id="transfer_section" className={inputClass} {...register('section_id')}>
                <option value="">No section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>Section {section.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Roll No" htmlFor="transfer_roll">
              <input id="transfer_roll" className={inputClass} {...register('roll_no')} />
            </FormField>
          </div>
        )}
        <FormField label="Transfer Date" htmlFor="transfer_date">
          <input id="transfer_date" type="date" className={inputClass} {...register('transfer_date')} />
        </FormField>
        <FormField label="Reason" htmlFor="transfer_reason">
          <textarea id="transfer_reason" rows={2} className={inputClass} {...register('transfer_reason')} />
        </FormField>
        <ModalActions onClose={onClose} isSaving={isSaving} />
      </form>
    </Modal>
  )
}

function PromoteModal({
  classes,
  sessions,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  classes: SchoolClass[]
  sessions: AcademicSession[]
  onClose: () => void
  onSubmit: (payload: PromoteStudentsPayload) => void
  isSaving: boolean
  error: string | null
}) {
  const { register, handleSubmit, watch, setValue } = useForm<PromoteFormValues>({
    defaultValues: {
      from_academic_session_id: '',
      to_academic_session_id: '',
      from_class_id: '',
      from_section_id: '',
      to_class_id: '',
      to_section_id: '',
    },
  })
  const fromClassId = watch('from_class_id')
  const toClassId = watch('to_class_id')
  const fromSections = classes.find((schoolClass) => String(schoolClass.id) === fromClassId)?.sections ?? []
  const toSections = classes.find((schoolClass) => String(schoolClass.id) === toClassId)?.sections ?? []

  return (
    <Modal title="Promote Students" description="Move active students from one class/section to another. Roll numbers are cleared." onClose={onClose}>
      <form onSubmit={handleSubmit((values) => onSubmit(toPromotePayload(values)))} className="space-y-4">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="From Session" htmlFor="from_session">
            <select id="from_session" className={inputClass} {...register('from_academic_session_id')}>
              <option value="">Any current session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="To Session" htmlFor="to_session">
            <select id="to_session" className={inputClass} {...register('to_academic_session_id')}>
              <option value="">Keep existing session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="From Class" htmlFor="from_class">
            <select id="from_class" className={inputClass} {...register('from_class_id', { required: true, onChange: () => setValue('from_section_id', '') })}>
              <option value="">Select class</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="From Section" htmlFor="from_section">
            <select id="from_section" className={inputClass} {...register('from_section_id')}>
              <option value="">All sections</option>
              {fromSections.map((section) => (
                <option key={section.id} value={section.id}>Section {section.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="To Class" htmlFor="to_class">
            <select id="to_class" className={inputClass} {...register('to_class_id', { required: true, onChange: () => setValue('to_section_id', '') })}>
              <option value="">Select class</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="To Section" htmlFor="to_section">
            <select id="to_section" className={inputClass} {...register('to_section_id')}>
              <option value="">No section</option>
              {toSections.map((section) => (
                <option key={section.id} value={section.id}>Section {section.name}</option>
              ))}
            </select>
          </FormField>
        </div>
        <ModalActions onClose={onClose} isSaving={isSaving} />
      </form>
    </Modal>
  )
}

function PhotoModal({
  student,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  student: Student
  onClose: () => void
  onSubmit: (file: File) => void
  isSaving: boolean
  error: string | null
}) {
  const [file, setFile] = useState<File | null>(null)

  return (
    <Modal title={`Upload Photo - ${student.full_name}`} onClose={onClose}>
      <div className="space-y-4">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-paper/45 px-4 py-8 text-center text-ink/55 transition hover:border-accent hover:text-accent">
          <UploadIcon width={22} height={22} />
          <span className="text-sm font-semibold">{file ? file.name : 'Choose JPG, PNG, or WebP photo'}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-accent hover:text-accent">
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || isSaving}
            onClick={() => file && onSubmit(file)}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-paper/35 p-4">
      <h3 className="text-[0.8rem] font-bold uppercase tracking-wider text-ink/45">{title}</h3>
      {children}
    </section>
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

function StudentTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="border-b border-line bg-paper/60 px-5 py-3.5">
          <div className="h-3 w-24 animate-pulse rounded bg-ink/10" />
        </div>
        <div className="divide-y divide-line/60">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-3.5">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-ink/[0.07]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 animate-pulse rounded bg-ink/[0.08]" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-ink/[0.05]" />
              </div>
              <div className="hidden h-3 w-28 animate-pulse rounded bg-ink/[0.06] sm:block" />
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

function StudentErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-white py-20 text-center shadow-sm">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#dc2626]/10 text-[#dc2626]">
        <ArchiveIcon width={26} height={26} />
      </span>
      <p className="mt-4 font-semibold text-ink/75">We couldn’t load students.</p>
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

function toStudentPayload(values: StudentFormValues): StudentPayload {
  const guardianName = optional(values.guardian_name)
  const guardian = guardianName
    ? [{
        id: numberOrUndefined(values.guardian_id),
        name: guardianName,
        relation: optional(values.guardian_relation),
        phone: optional(values.guardian_phone),
        email: optional(values.guardian_email),
        occupation: optional(values.guardian_occupation),
        address: optional(values.guardian_address),
        is_primary: true,
        is_emergency_contact: true,
        pickup_allowed: !!values.pickup_allowed,
      }]
    : []

  return {
    academic_session_id: numberOrNull(values.academic_session_id),
    admission_no: optional(values.admission_no),
    admission_type: optional(values.admission_type),
    first_name: String(values.first_name ?? '').trim(),
    middle_name: optional(values.middle_name),
    last_name: optional(values.last_name),
    gender: optional(values.gender),
    date_of_birth: optional(values.date_of_birth),
    class_id: numberOrNull(values.class_id),
    section_id: numberOrNull(values.section_id),
    roll_no: optional(values.roll_no),
    house: optional(values.house),
    category: optional(values.category),
    religion: optional(values.religion),
    blood_group: optional(values.blood_group),
    nationality: optional(values.nationality),
    mother_tongue: optional(values.mother_tongue),
    primary_phone: optional(values.primary_phone),
    primary_email: optional(values.primary_email),
    current_address: optional(values.current_address),
    permanent_address: optional(values.permanent_address),
    city: optional(values.city),
    state: optional(values.state),
    postal_code: optional(values.postal_code),
    country: optional(values.country),
    guardian_name: optional(values.guardian_name),
    guardian_phone: optional(values.guardian_phone),
    emergency_contact_name: optional(values.emergency_contact_name),
    emergency_contact_relation: optional(values.emergency_contact_relation),
    emergency_contact_phone: optional(values.emergency_contact_phone),
    medical_conditions: optional(values.medical_conditions),
    allergies: optional(values.allergies),
    medications: optional(values.medications),
    doctor_name: optional(values.doctor_name),
    doctor_phone: optional(values.doctor_phone),
    previous_school_name: optional(values.previous_school_name),
    previous_school_board: optional(values.previous_school_board),
    previous_school_class: optional(values.previous_school_class),
    previous_school_transfer_certificate_no: optional(values.previous_school_transfer_certificate_no),
    status: optional(values.status),
    admission_date: optional(values.admission_date),
    guardians: guardian,
  }
}

function toTransferPayload(values: TransferFormValues): TransferStudentPayload {
  return {
    transfer_type: values.transfer_type,
    academic_session_id: numberOrNull(values.academic_session_id),
    class_id: numberOrNull(values.class_id),
    section_id: numberOrNull(values.section_id),
    roll_no: optional(values.roll_no),
    transfer_date: optional(values.transfer_date),
    transfer_reason: optional(values.transfer_reason),
  }
}

function toPromotePayload(values: PromoteFormValues): PromoteStudentsPayload {
  return {
    from_academic_session_id: numberOrNull(values.from_academic_session_id),
    to_academic_session_id: numberOrNull(values.to_academic_session_id),
    from_class_id: Number(values.from_class_id),
    from_section_id: numberOrNull(values.from_section_id),
    to_class_id: Number(values.to_class_id),
    to_section_id: numberOrNull(values.to_section_id),
  }
}

function optional(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function numberOrNull(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  return Number(value)
}

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return Number(value)
}

function idValue(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}

function titleize(value: string): string {
  return value
    ? value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    : ''
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

function setFilter(setter: (value: string) => void, value: string, setPage: (value: number) => void) {
  setter(value)
  setPage(1)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

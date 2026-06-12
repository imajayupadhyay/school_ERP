import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/features/auth/AuthContext'
import { fetchClasses } from '@/features/admin/academic-setup/api'
import type { SchoolClass } from '@/features/admin/academic-setup/types'
import { extractErrorMessage } from '@/lib/errors'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { RowAction } from '../components/TableUI'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardUserIcon,
  EditIcon,
  FilterIcon,
  PlusIcon,
  SearchIcon,
  TeachersIcon,
  TrashIcon,
} from '../components/icons'
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  syncEmployeeAssignments,
  updateEmployee,
} from './api'
import type {
  Employee,
  EmployeeAssignment,
  EmployeeAssignmentPayload,
  EmployeeListParams,
  EmployeePayload,
} from './types'

const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin']
const PER_PAGE = 10

const ROLE_OPTIONS = [
  { value: 'principal', label: 'Principal' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'transport_manager', label: 'Transport Manager' },
  { value: 'hostel_warden', label: 'Hostel Warden' },
  { value: 'staff', label: 'Staff' },
]

type EmployeeFormValues = Omit<EmployeePayload, 'experience_years'> & {
  experience_years?: string | null
}

type AssignmentDraft = {
  localId: string
  assignment_type: 'class_teacher' | 'subject_teacher'
  class_id: string
  section_id: string
  subject_id: string
}

export default function EmployeePage() {
  const { user } = useAuth()
  const canEdit = !!user && EDITOR_ROLES.includes(user.role)
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [employeeType, setEmployeeType] = useState('')
  const [employeeModal, setEmployeeModal] = useState<Employee | 'new' | null>(null)
  const [assignmentModal, setAssignmentModal] = useState<Employee | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const params: EmployeeListParams = {
    page,
    per_page: PER_PAGE,
    search: search.trim() || undefined,
    status: status || undefined,
    employee_type: employeeType || undefined,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['employees', params],
    queryFn: () => fetchEmployees(params),
  })

  const invalidateEmployees = () => queryClient.invalidateQueries({ queryKey: ['employees'] })

  const saveMutation = useMutation({
    mutationFn: (vars: { id?: number; payload: EmployeePayload }) =>
      vars.id ? updateEmployee(vars.id, vars.payload) : createEmployee(vars.payload),
    onSuccess: () => {
      invalidateEmployees()
      setEmployeeModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: invalidateEmployees,
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const assignmentMutation = useMutation({
    mutationFn: (vars: { id: number; assignments: EmployeeAssignmentPayload[] }) =>
      syncEmployeeAssignments(vars.id, vars.assignments),
    onSuccess: () => {
      invalidateEmployees()
      setAssignmentModal(null)
      setModalError(null)
    },
    onError: (err) => setModalError(extractErrorMessage(err)),
  })

  const employees = data?.items ?? []
  const meta = data?.meta

  const activeFilters = [search, status, employeeType].filter(Boolean).length
  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setEmployeeType('')
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
              <TeachersIcon width={24} height={24} />
            </span>
            <div>
              <h1 className="text-[1.7rem] font-extrabold leading-tight tracking-[-0.02em]">Teachers &amp; Staff</h1>
              <p className="mt-1 max-w-xl text-[0.9rem] text-paper/65">
                Manage employee profiles, login access, and teaching assignments.
              </p>
              {meta && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1 text-[0.78rem] font-semibold text-paper ring-1 ring-paper/15">
                  <span className="text-lime">{meta.total}</span>
                  {meta.total === 1 ? 'employee' : 'employees'}
                  {activeFilters > 0 && <span className="text-paper/55">· filtered</span>}
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setEmployeeModal('new')}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
            >
              <PlusIcon width={17} height={17} />
              Add Employee
            </button>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          You have read-only access to teachers and staff. Contact your school admin or principal to make changes.
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
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(2,minmax(0,200px))]">
          <label className="relative">
            <span className="sr-only">Search employees</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" width={17} height={17} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className={`${inputClass} pl-9`}
              placeholder="Search name, code, phone, department"
            />
          </label>

          <select
            value={employeeType}
            onChange={(event) => {
              setEmployeeType(event.target.value)
              setPage(1)
            }}
            className={inputClass}
            aria-label="Filter by employee type"
          >
            <option value="">All types</option>
            <option value="teaching">Teaching</option>
            <option value="non_teaching">Non-teaching</option>
          </select>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className={inputClass}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <EmployeeTableSkeleton />
      ) : isError ? (
        <EmployeeErrorState onRetry={() => refetch()} />
      ) : employees.length === 0 ? (
        <EmployeeEmptyState canEdit={canEdit} hasFilters={activeFilters > 0} onReset={resetFilters} onAdd={() => setEmployeeModal('new')} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
            <table className="w-full min-w-[980px] text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                  <th className="px-5 py-3.5 font-bold">Employee</th>
                  <th className="px-4 py-3.5 font-bold">Role</th>
                  <th className="px-4 py-3.5 font-bold">Contact</th>
                  <th className="px-4 py-3.5 font-bold">Assignments</th>
                  <th className="px-4 py-3.5 font-bold">Login</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  {canEdit && <th className="px-5 py-3.5 text-right font-bold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    canEdit={canEdit}
                    onEdit={() => setEmployeeModal(employee)}
                    onAssign={() => setAssignmentModal(employee)}
                    onDelete={() => {
                      if (window.confirm(`Delete ${employee.full_name}? Their login will be deactivated.`)) {
                        deleteMutation.mutate(employee.id)
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

      {employeeModal && (
        <EmployeeFormModal
          employee={employeeModal === 'new' ? null : employeeModal}
          onClose={() => {
            setEmployeeModal(null)
            setModalError(null)
          }}
          onSubmit={(payload) =>
            saveMutation.mutate({ id: employeeModal === 'new' ? undefined : employeeModal.id, payload })
          }
          isSaving={saveMutation.isPending}
          error={modalError}
        />
      )}

      {assignmentModal && (
        <AssignmentsModal
          employee={assignmentModal}
          onClose={() => {
            setAssignmentModal(null)
            setModalError(null)
          }}
          onSubmit={(assignments) => assignmentMutation.mutate({ id: assignmentModal.id, assignments })}
          isSaving={assignmentMutation.isPending}
          error={modalError}
        />
      )}
    </div>
  )
}

function EmployeeRow({
  employee,
  canEdit,
  onEdit,
  onAssign,
  onDelete,
}: {
  employee: Employee
  canEdit: boolean
  onEdit: () => void
  onAssign: () => void
  onDelete: () => void
}) {
  const teaching = employee.employee_type === 'teaching'
  return (
    <tr className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-paper-2 to-paper text-[0.82rem] font-bold text-ink/60 ring-1 ring-line transition group-hover:ring-accent/30">
            {initials(employee.full_name)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">{employee.full_name}</div>
            <div className="mt-0.5 text-[0.76rem] text-ink/45">{employee.employee_code}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-ink/75">{employee.designation ?? titleize(employee.employee_type)}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[0.66rem] font-bold uppercase tracking-wide ${
              teaching ? 'bg-[#2c49a6]/10 text-[#2c49a6]' : 'bg-ink/8 text-ink/55'
            }`}
          >
            {teaching ? 'Teaching' : 'Non-teaching'}
          </span>
          <span className="text-[0.74rem] text-ink/45">{employee.department ?? titleize(employee.employment_type)}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-ink/65">
        <div className="truncate">{employee.phone ?? '—'}</div>
        <div className="mt-0.5 truncate text-[0.76rem] text-ink/45">{employee.email ?? '—'}</div>
      </td>
      <td className="max-w-[260px] px-4 py-3 text-ink/65">
        <AssignmentSummary assignments={employee.assignments} />
      </td>
      <td className="px-4 py-3">
        {employee.login.has_login ? (
          <StatusBadge status={employee.login.status ?? 'inactive'} />
        ) : (
          <span className="text-[0.78rem] text-ink/35">No login</span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={employee.status} />
      </td>
      {canEdit && (
        <td className="px-5 py-3">
          <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
            <RowAction label="Assignments" onClick={onAssign}>
              <ClipboardUserIcon width={17} height={17} />
            </RowAction>
            <RowAction label="Edit" onClick={onEdit}>
              <EditIcon width={17} height={17} />
            </RowAction>
            <RowAction label="Delete" onClick={onDelete} danger>
              <TrashIcon width={17} height={17} />
            </RowAction>
          </div>
        </td>
      )}
    </tr>
  )
}

function EmployeeEmptyState({
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
        <TeachersIcon width={30} height={30} />
      </span>
      <h3 className="mt-4 text-[1.05rem] font-bold text-ink">
        {hasFilters ? 'No employees match these filters' : 'No employees yet'}
      </h3>
      <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
        {hasFilters
          ? 'Try adjusting or clearing the filters to see more results.'
          : 'Add your first teacher or staff member to manage profiles, logins, and assignments.'}
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
            Add Employee
          </button>
        )}
      </div>
    </div>
  )
}

function EmployeeFormModal({
  employee,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  employee: Employee | null
  onClose: () => void
  onSubmit: (payload: EmployeePayload) => void
  isSaving: boolean
  error: string | null
}) {
  const defaultRole = employee?.employee_type === 'non_teaching' ? 'staff' : 'teacher'
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    defaultValues: employee
      ? {
          employee_code: employee.employee_code,
          first_name: employee.first_name,
          last_name: employee.last_name ?? '',
          gender: employee.gender ?? '',
          date_of_birth: employee.date_of_birth ?? '',
          employee_type: employee.employee_type,
          designation: employee.designation ?? '',
          department: employee.department ?? '',
          employment_type: employee.employment_type,
          joining_date: employee.joining_date ?? '',
          qualification: employee.qualification ?? '',
          experience_years: employee.experience_years ?? '',
          email: employee.email ?? '',
          phone: employee.phone ?? '',
          alternate_phone: employee.alternate_phone ?? '',
          address: employee.address ?? '',
          emergency_contact_name: employee.emergency_contact_name ?? '',
          emergency_contact_phone: employee.emergency_contact_phone ?? '',
          status: employee.status,
          login_enabled: employee.login.enabled,
          login_email: employee.login.email ?? employee.email ?? '',
          login_password: '',
          login_role: employee.login.role ?? defaultRole,
          login_status: employee.login.status ?? 'active',
        }
      : {
          employee_code: '',
          first_name: '',
          last_name: '',
          gender: '',
          employee_type: 'teaching',
          designation: '',
          department: '',
          employment_type: 'full_time',
          joining_date: '',
          qualification: '',
          experience_years: '',
          email: '',
          phone: '',
          alternate_phone: '',
          address: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          status: 'active',
          login_enabled: false,
          login_email: '',
          login_password: '',
          login_role: 'teacher',
          login_status: 'active',
        },
  })

  const loginEnabled = watch('login_enabled')

  return (
    <Modal
      title={employee ? 'Edit Employee' : 'Add Employee'}
      description="Profile, contact, employment, and login details."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit((values) => onSubmit(toEmployeePayload(values)))} className="space-y-5">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Employee Code" htmlFor="employee_code" error={errors.employee_code}>
            <input
              id="employee_code"
              className={inputClass}
              placeholder="EMP001"
              {...register('employee_code', { required: 'Employee code is required.' })}
            />
          </FormField>
          <FormField label="First Name" htmlFor="first_name" error={errors.first_name}>
            <input
              id="first_name"
              className={inputClass}
              {...register('first_name', { required: 'First name is required.' })}
            />
          </FormField>
          <FormField label="Last Name" htmlFor="last_name" error={errors.last_name}>
            <input id="last_name" className={inputClass} {...register('last_name')} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Employee Type" htmlFor="employee_type" error={errors.employee_type}>
            <select id="employee_type" className={inputClass} {...register('employee_type')}>
              <option value="teaching">Teaching</option>
              <option value="non_teaching">Non-teaching</option>
            </select>
          </FormField>
          <FormField label="Designation" htmlFor="designation" error={errors.designation}>
            <input id="designation" className={inputClass} placeholder="Teacher" {...register('designation')} />
          </FormField>
          <FormField label="Department" htmlFor="department" error={errors.department}>
            <input id="department" className={inputClass} placeholder="Senior" {...register('department')} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Employment" htmlFor="employment_type" error={errors.employment_type}>
            <select id="employment_type" className={inputClass} {...register('employment_type')}>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
              <option value="temporary">Temporary</option>
            </select>
          </FormField>
          <FormField label="Joining Date" htmlFor="joining_date" error={errors.joining_date}>
            <input id="joining_date" type="date" className={inputClass} {...register('joining_date')} />
          </FormField>
          <FormField label="Status" htmlFor="status" error={errors.status}>
            <select id="status" className={inputClass} {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On leave</option>
              <option value="terminated">Terminated</option>
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
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
          <FormField label="Experience" htmlFor="experience_years" error={errors.experience_years}>
            <input id="experience_years" type="number" step="0.5" min="0" className={inputClass} {...register('experience_years')} />
          </FormField>
        </div>

        <FormField label="Qualification" htmlFor="qualification" error={errors.qualification}>
          <input id="qualification" className={inputClass} placeholder="B.Ed, M.Ed, MBA" {...register('qualification')} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Email" htmlFor="email" error={errors.email}>
            <input id="email" type="email" className={inputClass} {...register('email')} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" error={errors.phone}>
            <input id="phone" className={inputClass} {...register('phone')} />
          </FormField>
          <FormField label="Alternate Phone" htmlFor="alternate_phone" error={errors.alternate_phone}>
            <input id="alternate_phone" className={inputClass} {...register('alternate_phone')} />
          </FormField>
        </div>

        <FormField label="Address" htmlFor="address" error={errors.address}>
          <textarea id="address" rows={2} className={inputClass} {...register('address')} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Emergency Contact" htmlFor="emergency_contact_name" error={errors.emergency_contact_name}>
            <input id="emergency_contact_name" className={inputClass} {...register('emergency_contact_name')} />
          </FormField>
          <FormField label="Emergency Phone" htmlFor="emergency_contact_phone" error={errors.emergency_contact_phone}>
            <input id="emergency_contact_phone" className={inputClass} {...register('emergency_contact_phone')} />
          </FormField>
        </div>

        <div className="rounded-2xl border border-line bg-paper/45 p-4">
          <label className="flex items-center gap-3 text-[0.9rem] font-semibold text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30"
              {...register('login_enabled')}
            />
            Enable login access
          </label>

          {loginEnabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField label="Login Email" htmlFor="login_email" error={errors.login_email}>
                <input id="login_email" type="email" className={inputClass} {...register('login_email')} />
              </FormField>
              <FormField
                label={employee ? 'New Password' : 'Password'}
                htmlFor="login_password"
                error={errors.login_password}
                hint={employee ? 'Leave blank to keep current password.' : undefined}
              >
                <input
                  id="login_password"
                  type="password"
                  className={inputClass}
                  {...register('login_password', {
                    required: employee ? false : 'Password is required when login access is enabled.',
                    minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                  })}
                />
              </FormField>
              <FormField label="Login Role" htmlFor="login_role" error={errors.login_role}>
                <select id="login_role" className={inputClass} {...register('login_role')}>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Login Status" htmlFor="login_status" error={errors.login_status}>
                <select id="login_status" className={inputClass} {...register('login_status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </FormField>
            </div>
          )}
        </div>

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
      </form>
    </Modal>
  )
}

function AssignmentsModal({
  employee,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  employee: Employee
  onClose: () => void
  onSubmit: (assignments: EmployeeAssignmentPayload[]) => void
  isSaving: boolean
  error: string | null
}) {
  const { data: classes, isLoading } = useQuery({ queryKey: ['classes'], queryFn: fetchClasses })
  const [drafts, setDrafts] = useState<AssignmentDraft[]>(() =>
    employee.assignments.length > 0
      ? employee.assignments.map(toDraft)
      : [newAssignmentDraft()],
  )

  const hasInvalidRows = drafts.length > 0 && drafts.some((draft) => {
    if (!draft.class_id) return true
    if (draft.assignment_type === 'subject_teacher' && !draft.subject_id) return true
    return false
  })

  const updateDraft = (localId: string, patch: Partial<AssignmentDraft>) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.localId !== localId) return draft

        const next = { ...draft, ...patch }
        if (patch.class_id !== undefined) {
          next.section_id = ''
          next.subject_id = ''
        }
        if (patch.assignment_type === 'class_teacher') {
          next.subject_id = ''
        }
        return next
      }),
    )
  }

  const payload = drafts
    .filter((draft) => draft.class_id)
    .map((draft) => ({
      assignment_type: draft.assignment_type,
      class_id: Number(draft.class_id),
      section_id: draft.section_id ? Number(draft.section_id) : null,
      subject_id: draft.assignment_type === 'subject_teacher' && draft.subject_id ? Number(draft.subject_id) : null,
      status: 'active',
    }))

  return (
    <Modal title={`Assignments - ${employee.full_name}`} description="Assign class teacher and subject teacher responsibilities." onClose={onClose} size="lg">
      <div className="space-y-4">
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        {isLoading ? (
          <p className="text-[0.85rem] text-ink/50">Loading classes...</p>
        ) : (classes ?? []).length === 0 ? (
          <p className="text-[0.85rem] text-ink/50">Create classes and subjects before assigning teachers.</p>
        ) : (
          <div className="space-y-3">
            {drafts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-paper/35 px-4 py-6 text-center text-[0.85rem] text-ink/45">
                No assignments selected.
              </div>
            ) : (
              drafts.map((draft, index) => (
                <AssignmentRow
                  key={draft.localId}
                  draft={draft}
                  index={index}
                  classes={classes ?? []}
                  onChange={(patch) => updateDraft(draft.localId, patch)}
                  onRemove={() => setDrafts((current) => current.filter((item) => item.localId !== draft.localId))}
                />
              ))
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setDrafts((current) => [...current, newAssignmentDraft()])}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
        >
          <PlusIcon width={15} height={15} />
          Add Assignment
        </button>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(payload)}
            disabled={isSaving || hasInvalidRows}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AssignmentRow({
  draft,
  index,
  classes,
  onChange,
  onRemove,
}: {
  draft: AssignmentDraft
  index: number
  classes: SchoolClass[]
  onChange: (patch: Partial<AssignmentDraft>) => void
  onRemove: () => void
}) {
  const selectedClass = useMemo(
    () => classes.find((schoolClass) => schoolClass.id === Number(draft.class_id)),
    [classes, draft.class_id],
  )
  const sections = selectedClass?.sections ?? []
  const subjects = selectedClass?.subjects ?? []

  return (
    <div className="rounded-2xl border border-line bg-paper/45 p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[0.78rem] font-semibold uppercase tracking-wider text-ink/45">Assignment {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-[0.78rem] font-semibold text-[#dc2626] hover:underline">
          Remove
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <select
          value={draft.assignment_type}
          onChange={(event) => onChange({ assignment_type: event.target.value as AssignmentDraft['assignment_type'] })}
          className={inputClass}
          aria-label="Assignment type"
        >
          <option value="subject_teacher">Subject teacher</option>
          <option value="class_teacher">Class teacher</option>
        </select>

        <select value={draft.class_id} onChange={(event) => onChange({ class_id: event.target.value })} className={inputClass} aria-label="Class">
          <option value="">Class</option>
          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name}
            </option>
          ))}
        </select>

        <select value={draft.section_id} onChange={(event) => onChange({ section_id: event.target.value })} className={inputClass} aria-label="Section">
          <option value="">All sections</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              Section {section.name}
            </option>
          ))}
        </select>

        <select
          value={draft.subject_id}
          onChange={(event) => onChange({ subject_id: event.target.value })}
          disabled={draft.assignment_type === 'class_teacher'}
          className={inputClass}
          aria-label="Subject"
        >
          <option value="">{draft.assignment_type === 'class_teacher' ? 'No subject' : 'Subject'}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function AssignmentSummary({ assignments }: { assignments: EmployeeAssignment[] }) {
  if (assignments.length === 0) {
    return <span className="text-ink/35">No assignments</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {assignments.slice(0, 3).map((assignment) => (
        <span key={assignment.id} className="rounded-full bg-paper-2 px-2.5 py-1 text-[0.72rem] font-semibold text-ink/60">
          {assignmentLabel(assignment)}
        </span>
      ))}
      {assignments.length > 3 && (
        <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[0.72rem] font-semibold text-ink/45">
          +{assignments.length - 3}
        </span>
      )}
    </div>
  )
}

function EmployeeTableSkeleton() {
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
              <div className="hidden h-6 w-20 animate-pulse rounded-full bg-ink/[0.06] sm:block" />
              <div className="hidden h-6 w-16 animate-pulse rounded-full bg-ink/[0.06] md:block" />
              <div className="h-8 w-20 animate-pulse rounded-lg bg-ink/[0.05]" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-14 animate-pulse rounded-2xl bg-ink/[0.05]" />
    </div>
  )
}

function EmployeeErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-white py-20 text-center shadow-sm">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#dc2626]/10 text-[#dc2626]">
        <TrashIcon width={26} height={26} />
      </span>
      <p className="mt-4 font-semibold text-ink/75">We couldn’t load employees.</p>
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

function toEmployeePayload(values: EmployeeFormValues): EmployeePayload {
  return {
    employee_code: values.employee_code.trim(),
    first_name: values.first_name.trim(),
    last_name: optional(values.last_name),
    gender: optional(values.gender),
    date_of_birth: optional(values.date_of_birth),
    employee_type: values.employee_type,
    designation: optional(values.designation),
    department: optional(values.department),
    employment_type: values.employment_type,
    joining_date: optional(values.joining_date),
    qualification: optional(values.qualification),
    experience_years: values.experience_years ? Number(values.experience_years) : null,
    email: optional(values.email),
    phone: optional(values.phone),
    alternate_phone: optional(values.alternate_phone),
    address: optional(values.address),
    emergency_contact_name: optional(values.emergency_contact_name),
    emergency_contact_phone: optional(values.emergency_contact_phone),
    status: values.status,
    login_enabled: !!values.login_enabled,
    login_email: optional(values.login_email),
    login_password: optional(values.login_password),
    login_role: optional(values.login_role),
    login_status: optional(values.login_status),
  }
}

function optional(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function titleize(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function assignmentLabel(assignment: EmployeeAssignment): string {
  const className = assignment.class?.name ?? `Class ${assignment.class_id}`
  const sectionName = assignment.section ? ` ${assignment.section.name}` : ''

  if (assignment.assignment_type === 'class_teacher') {
    return `Class Teacher: ${className}${sectionName}`
  }

  const subjectName = assignment.subject?.name ?? 'Subject'
  return `${subjectName}: ${className}${sectionName}`
}

function toDraft(assignment: EmployeeAssignment): AssignmentDraft {
  return {
    localId: String(assignment.id),
    assignment_type: assignment.assignment_type,
    class_id: String(assignment.class_id),
    section_id: assignment.section_id ? String(assignment.section_id) : '',
    subject_id: assignment.subject_id ? String(assignment.subject_id) : '',
  }
}

function newAssignmentDraft(): AssignmentDraft {
  return {
    localId: `${Date.now()}-${Math.random()}`,
    assignment_type: 'subject_teacher',
    class_id: '',
    section_id: '',
    subject_id: '',
  }
}

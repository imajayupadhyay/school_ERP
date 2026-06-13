import { useState } from 'react'
import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from '@/features/admin/components/Modal'
import { inputClass } from '@/features/admin/components/FormField'
import { createSchool, updateSchool } from '../api'
import type { CreateSchoolResult, PlatformSchool } from '../types'

interface SchoolFormModalProps {
  mode: 'create' | 'edit'
  school?: PlatformSchool
  onClose: () => void
  onCreated: (result: CreateSchoolResult) => void
  onUpdated: (school: PlatformSchool) => void
}

interface FormState {
  name: string
  code: string
  status: string
  email: string
  phone: string
  city: string
  state: string
  country: string
  board_affiliation: string
  admin_name: string
  admin_email: string
  admin_phone: string
  admin_password: string
}

const STATUS_OPTIONS = ['active', 'inactive', 'suspended']

export default function SchoolFormModal({ mode, school, onClose, onCreated, onUpdated }: SchoolFormModalProps) {
  const isEdit = mode === 'edit'
  const queryClient = useQueryClient()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    name: school?.name ?? '',
    code: school?.code ?? '',
    status: school?.status ?? 'active',
    email: school?.email ?? '',
    phone: school?.phone ?? '',
    city: school?.city ?? '',
    state: school?.state ?? '',
    country: school?.country ?? '',
    board_affiliation: school?.board_affiliation ?? '',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    admin_password: '',
  })

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit && school) {
        return {
          kind: 'update' as const,
          school: await updateSchool(school.id, {
            name: form.name.trim(),
            code: form.code.trim(),
            status: form.status,
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            city: form.city.trim() || null,
            state: form.state.trim() || null,
            country: form.country.trim() || null,
            board_affiliation: form.board_affiliation.trim() || null,
          }),
        }
      }
      return {
        kind: 'create' as const,
        result: await createSchool({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          status: form.status,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          country: form.country.trim() || undefined,
          board_affiliation: form.board_affiliation.trim() || undefined,
          admin_name: form.admin_name.trim(),
          admin_email: form.admin_email.trim(),
          admin_phone: form.admin_phone.trim() || undefined,
          admin_password: form.admin_password.trim() || undefined,
        }),
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'schools'] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'dashboard'] })
      if (res.kind === 'create') onCreated(res.result)
      else onUpdated(res.school)
    },
    onError: (err) => {
      setFieldErrors({})
      setGeneralError(null)
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          // No HTTP response = network/CORS failure or the API server is down.
          setGeneralError('Cannot reach the server. Make sure the API is running, then try again.')
          return
        }
        const data = err.response.data as { message?: string; errors?: Record<string, string[]> } | undefined
        if (data?.errors) setFieldErrors(data.errors)
        setGeneralError(data?.message ?? 'Something went wrong. Please try again.')
      } else {
        setGeneralError('Something went wrong. Please try again.')
      }
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mutation.isPending) return
    setFieldErrors({})
    setGeneralError(null)
    mutation.mutate()
  }

  const err = (key: string) => fieldErrors[key]?.[0]

  return (
    <Modal
      title={isEdit ? `Edit ${school?.name}` : 'Add School'}
      description={isEdit ? 'Update tenant profile and lifecycle status.' : 'Create a new school tenant and its first owner admin.'}
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {generalError && (
          <div className="rounded-xl border border-[#dc2626]/25 bg-[#dc2626]/[0.06] px-4 py-3 text-[0.85rem] text-[#b91c1c]">
            {generalError}
          </div>
        )}

        <Section title="School details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="School name" required error={err('name')}>
              <input className={inputClass} value={form.name} onChange={set('name')} placeholder="Green Valley High" />
            </Field>
            <Field
              label="School code"
              error={err('code')}
              hint={isEdit ? 'Used at login. Changing it affects staff sign-in.' : 'Optional — auto-generated if left blank.'}
            >
              <input className={inputClass} value={form.code} onChange={set('code')} placeholder="GVH" />
            </Field>
            <Field label="Status" error={err('status')}>
              <select className={inputClass} value={form.status} onChange={set('status')}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Board / affiliation" error={err('board_affiliation')}>
              <input className={inputClass} value={form.board_affiliation} onChange={set('board_affiliation')} placeholder="CBSE" />
            </Field>
            <Field label="Email" error={err('email')}>
              <input className={inputClass} type="email" value={form.email} onChange={set('email')} placeholder="office@school.com" />
            </Field>
            <Field label="Phone" error={err('phone')}>
              <input className={inputClass} value={form.phone} onChange={set('phone')} placeholder="+91…" />
            </Field>
            <Field label="City" error={err('city')}>
              <input className={inputClass} value={form.city} onChange={set('city')} placeholder="Pune" />
            </Field>
            <Field label="State" error={err('state')}>
              <input className={inputClass} value={form.state} onChange={set('state')} placeholder="Maharashtra" />
            </Field>
            <Field label="Country" error={err('country')}>
              <input className={inputClass} value={form.country} onChange={set('country')} placeholder="India" />
            </Field>
          </div>
        </Section>

        {!isEdit && (
          <Section title="Owner admin account" subtitle="This person gets full access to the school panel.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Admin name" required error={err('admin_name')}>
                <input className={inputClass} value={form.admin_name} onChange={set('admin_name')} placeholder="Riya Sharma" />
              </Field>
              <Field label="Admin email" required error={err('admin_email')}>
                <input className={inputClass} type="email" value={form.admin_email} onChange={set('admin_email')} placeholder="admin@school.com" />
              </Field>
              <Field label="Admin phone" error={err('admin_phone')}>
                <input className={inputClass} value={form.admin_phone} onChange={set('admin_phone')} placeholder="+91…" />
              </Field>
              <Field label="Password" error={err('admin_password')} hint="Leave blank to auto-generate a temporary password.">
                <input className={inputClass} type="text" value={form.admin_password} onChange={set('admin_password')} placeholder="Min 8 characters" />
              </Field>
            </div>
          </Section>
        )}

        <div className="flex items-center justify-end gap-2.5 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(81,69,205,.7)] transition hover:bg-accent-2 disabled:opacity-60"
          >
            {mutation.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {isEdit ? 'Save changes' : 'Create school'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-[0.85rem] font-bold uppercase tracking-[0.06em] text-ink/55">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[0.78rem] text-ink/45">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.82rem] font-semibold text-ink/70">
        {label}
        {required && <span className="text-[#dc2626]"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[0.74rem] text-ink/40">{hint}</p>}
      {error && <p className="text-[0.78rem] font-medium text-[#dc2626]">{error}</p>}
    </div>
  )
}

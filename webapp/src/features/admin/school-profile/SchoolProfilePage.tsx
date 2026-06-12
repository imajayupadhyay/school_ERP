import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/features/auth/AuthContext'
import { extractErrorMessage } from '@/lib/errors'
import { fetchSchoolProfile, updateSchoolProfile, uploadSchoolLogo } from './api'
import type { SchoolProfile, UpdateSchoolProfilePayload } from './types'
import FormField, { inputClass } from '../components/FormField'
import SectionCard from '../components/SectionCard'
import { SettingsIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import LogoUploader from './components/LogoUploader'

const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin']

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const BOARD_OPTIONS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Other']

const DATE_FORMAT_OPTIONS = [
  { value: 'd-m-Y', label: 'DD-MM-YYYY (31-12-2026)' },
  { value: 'm-d-Y', label: 'MM-DD-YYYY (12-31-2026)' },
  { value: 'Y-m-d', label: 'YYYY-MM-DD (2026-12-31)' },
  { value: 'd/m/Y', label: 'DD/MM/YYYY (31/12/2026)' },
]

export default function SchoolProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = !!user && EDITOR_ROLES.includes(user.role)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['school-profile'],
    queryFn: fetchSchoolProfile,
  })

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateSchoolProfilePayload>()

  useEffect(() => {
    if (data) reset(toFormValues(data))
  }, [data, reset])

  const updateMutation = useMutation({
    mutationFn: updateSchoolProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(['school-profile'], updated)
      reset(toFormValues(updated))
      setBanner({ type: 'success', text: 'School profile updated.' })
    },
    onError: (err) => {
      setBanner({ type: 'error', text: extractErrorMessage(err) })
    },
  })

  const logoMutation = useMutation({
    mutationFn: uploadSchoolLogo,
    onSuccess: (updated) => {
      queryClient.setQueryData(['school-profile'], updated)
      setLogoError(null)
      setBanner({ type: 'success', text: 'School logo updated.' })
    },
    onError: (err) => {
      setLogoError(extractErrorMessage(err))
    },
  })

  if (isLoading) return <SchoolProfileSkeleton />

  if (isError || !data) {
    return (
      <div className="grid place-items-center rounded-2xl border border-line bg-white py-20 text-center shadow-sm">
        <p className="font-semibold text-ink/75">We couldn’t load the school profile.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5"
        >
          Try again
        </button>
      </div>
    )
  }

  const onSubmit = (values: UpdateSchoolProfilePayload) => {
    setBanner(null)
    updateMutation.mutate(values)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SettingsIcon}
        title="School Profile"
        description="Manage your school's identity, contact details, and configuration."
      />

      {!canEdit && (
        <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">
          You have read-only access to the school profile. Contact your school admin or principal to make
          changes.
        </div>
      )}

      {banner && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-[0.88rem] ${
            banner.type === 'success'
              ? 'border-[#168a66]/25 bg-[#168a66]/[0.06] text-[#0f6b4f]'
              : 'border-[#dc2626]/25 bg-[#dc2626]/[0.06] text-[#b91c1c]'
          }`}
        >
          {banner.text}
        </div>
      )}

      <SectionCard title="Branding" description="Your school logo, shown across the admin panel and reports.">
        <div className="sm:col-span-2">
          <LogoUploader
            logoUrl={data.logo_url}
            schoolName={data.name}
            canEdit={canEdit}
            isUploading={logoMutation.isPending}
            onUpload={(file) => {
              setLogoError(null)
              setBanner(null)
              logoMutation.mutate(file)
            }}
            error={logoError}
          />
        </div>
      </SectionCard>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <SectionCard title="General Information" description="Basic identity and contact details.">
          <FormField label="School Name" htmlFor="name" error={errors.name}>
            <input
              id="name"
              className={inputClass}
              disabled={!canEdit}
              {...register('name', { required: 'School name is required.' })}
            />
          </FormField>

          <FormField label="School Code" htmlFor="code" hint="Used by staff and parents to log in. Contact support to change it.">
            <input id="code" className={inputClass} value={data.code} disabled readOnly />
          </FormField>

          <FormField label="Email" htmlFor="email" error={errors.email}>
            <input
              id="email"
              type="email"
              className={inputClass}
              disabled={!canEdit}
              {...register('email')}
            />
          </FormField>

          <FormField label="Phone" htmlFor="phone" error={errors.phone}>
            <input id="phone" className={inputClass} disabled={!canEdit} {...register('phone')} />
          </FormField>

          <FormField label="Alternate Phone" htmlFor="alternate_phone" error={errors.alternate_phone}>
            <input
              id="alternate_phone"
              className={inputClass}
              disabled={!canEdit}
              {...register('alternate_phone')}
            />
          </FormField>

          <FormField label="Website" htmlFor="website" error={errors.website}>
            <input
              id="website"
              className={inputClass}
              placeholder="https://www.yourschool.edu"
              disabled={!canEdit}
              {...register('website')}
            />
          </FormField>
        </SectionCard>

        <SectionCard title="Address" description="Used on documents, invoices, and reports.">
          <FormField label="Address Line 1" htmlFor="address" error={errors.address}>
            <input id="address" className={inputClass} disabled={!canEdit} {...register('address')} />
          </FormField>

          <FormField label="Address Line 2" htmlFor="address_line2" error={errors.address_line2}>
            <input
              id="address_line2"
              className={inputClass}
              disabled={!canEdit}
              {...register('address_line2')}
            />
          </FormField>

          <FormField label="City" htmlFor="city" error={errors.city}>
            <input id="city" className={inputClass} disabled={!canEdit} {...register('city')} />
          </FormField>

          <FormField label="State" htmlFor="state" error={errors.state}>
            <input id="state" className={inputClass} disabled={!canEdit} {...register('state')} />
          </FormField>

          <FormField label="Postal Code" htmlFor="postal_code" error={errors.postal_code}>
            <input
              id="postal_code"
              className={inputClass}
              disabled={!canEdit}
              {...register('postal_code')}
            />
          </FormField>

          <FormField label="Country" htmlFor="country" error={errors.country}>
            <input id="country" className={inputClass} disabled={!canEdit} {...register('country')} />
          </FormField>
        </SectionCard>

        <SectionCard
          title="Localization & Academic Year"
          description="Defaults used for dates, currency, and the academic calendar."
        >
          <FormField label="Timezone" htmlFor="timezone" error={errors.timezone} hint="e.g. Asia/Kolkata">
            <input id="timezone" className={inputClass} disabled={!canEdit} {...register('timezone')} />
          </FormField>

          <FormField label="Date Format" htmlFor="date_format" error={errors.date_format}>
            <select id="date_format" className={inputClass} disabled={!canEdit} {...register('date_format')}>
              {DATE_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Currency" htmlFor="currency" error={errors.currency} hint="e.g. INR, USD">
            <input id="currency" className={inputClass} disabled={!canEdit} {...register('currency')} />
          </FormField>

          <FormField
            label="Academic Year Starts In"
            htmlFor="academic_year_start_month"
            error={errors.academic_year_start_month}
          >
            <select
              id="academic_year_start_month"
              className={inputClass}
              disabled={!canEdit}
              {...register('academic_year_start_month', { valueAsNumber: true })}
            >
              {MONTHS.map((month, idx) => (
                <option key={month} value={idx + 1}>
                  {month}
                </option>
              ))}
            </select>
          </FormField>
        </SectionCard>

        <SectionCard title="Identifiers" description="Board affiliation and registration details.">
          <FormField label="Board Affiliation" htmlFor="board_affiliation" error={errors.board_affiliation}>
            <select
              id="board_affiliation"
              className={inputClass}
              disabled={!canEdit}
              {...register('board_affiliation')}
            >
              <option value="">Not set</option>
              {BOARD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Registration Number"
            htmlFor="registration_number"
            error={errors.registration_number}
          >
            <input
              id="registration_number"
              className={inputClass}
              disabled={!canEdit}
              {...register('registration_number')}
            />
          </FormField>

          <FormField label="UDISE Code" htmlFor="udise_code" error={errors.udise_code}>
            <input id="udise_code" className={inputClass} disabled={!canEdit} {...register('udise_code')} />
          </FormField>

          <FormField label="Principal Name" htmlFor="principal_name" error={errors.principal_name}>
            <input
              id="principal_name"
              className={inputClass}
              disabled={!canEdit}
              {...register('principal_name')}
            />
          </FormField>

          <FormField label="Established Year" htmlFor="established_year" error={errors.established_year}>
            <input
              id="established_year"
              type="number"
              className={inputClass}
              disabled={!canEdit}
              {...register('established_year', { valueAsNumber: true })}
            />
          </FormField>
        </SectionCard>

        {canEdit && (
          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/85 px-4 py-3 shadow-[0_18px_40px_-24px_rgba(19,28,61,.45)] backdrop-blur">
            <span className="text-[0.82rem] font-medium text-ink/55">
              {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => data && reset(toFormValues(data))}
                disabled={!isDirty || updateMutation.isPending}
                className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={!isDirty || updateMutation.isPending}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

function toFormValues(profile: SchoolProfile): UpdateSchoolProfilePayload {
  const { id: _id, code: _code, status: _status, logo_path: _logoPath, logo_url: _logoUrl, ...rest } = profile
  return rest
}

function SchoolProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-[112px] animate-pulse rounded-2xl bg-ink/[0.06]" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[180px] animate-pulse rounded-2xl bg-ink/[0.05]" />
      ))}
    </div>
  )
}

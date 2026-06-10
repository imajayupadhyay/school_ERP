import type { ReactNode } from 'react'
import type { FieldError } from 'react-hook-form'

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: FieldError
  children: ReactNode
  hint?: string
}

/** Labeled wrapper for a single form control, with inline error message. */
export default function FormField({ label, htmlFor, error, children, hint }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[0.82rem] font-semibold text-ink/70">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[0.74rem] text-ink/40">{hint}</p>}
      {error && <p className="text-[0.78rem] font-medium text-[#dc2626]">{error.message}</p>}
    </div>
  )
}

export const inputClass =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.9rem] text-ink placeholder:text-ink/35 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-paper-2/60 disabled:text-ink/50'

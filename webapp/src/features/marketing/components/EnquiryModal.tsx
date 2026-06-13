import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { api } from '@/lib/api'

interface EnquiryModalProps {
  open: boolean
  onClose: () => void
}

interface FieldDef {
  name: 'name' | 'email' | 'phone'
  label: string
  placeholder: string
  type?: string
}

const fields: FieldDef[] = [
  { name: 'name', label: 'Name', placeholder: 'Enter your name' },
  { name: 'email', label: 'Email', placeholder: 'Enter your email', type: 'email' },
  { name: 'phone', label: 'Phone', placeholder: 'Enter your phone number', type: 'tel' },
]

const EMPTY = { name: '', email: '', phone: '' }

/** Public "Start Trial" enquiry form — captures a sales lead (name, email, phone). */
export default function EnquiryModal({ open, onClose }: EnquiryModalProps) {
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Reset local state on close so the next open starts fresh (no reset effect).
  const handleClose = useCallback(() => {
    setForm(EMPTY)
    setError(null)
    setDone(false)
    setSubmitting(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) handleClose()
    }
    addEventListener('keydown', onKey)
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, handleClose])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await api.post('/enquiries', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      })
      setDone(true)
    } catch (err) {
      let message = 'Something went wrong. Please try again.'
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
        message =
          data?.errors?.email?.[0] ??
          data?.errors?.phone?.[0] ??
          data?.errors?.name?.[0] ??
          data?.message ??
          (!err.response ? 'Cannot reach the server. Please try again.' : message)
      }
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={`mk-modal fixed inset-0 z-[11000] items-center justify-center p-5 ${open ? 'open flex' : 'hidden'}`}
      aria-hidden={!open}
    >
      <div className="mk-modal-overlay absolute inset-0 bg-ink/60 backdrop-blur-md" onClick={handleClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-title"
        className="mk-modal-card relative z-[1] w-[min(520px,100%)] max-h-[90vh] overflow-y-auto rounded-[20px] bg-white text-ink shadow-[0_40px_100px_rgba(0,0,0,.45)]"
      >
        <div className="flex items-center justify-between border-b border-[#e8ebef] px-5 md:px-[34px] py-6">
          <h3 id="enquiry-title" className="text-[clamp(1.3rem,3vw,1.6rem)] font-extrabold tracking-[-0.02em]">
            Get in touch
          </h3>
          <button
            type="button"
            data-hover
            aria-label="Close"
            onClick={handleClose}
            className="grid h-[42px] w-[42px] place-items-center rounded-full text-[#64748b] transition hover:rotate-90 hover:bg-[#f1f3f6] hover:text-accent"
          >
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 md:px-[34px] pt-7 pb-8">
          {done ? (
            <div className="py-6 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/12 text-accent">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m20 6-11 11-5-5" />
                </svg>
              </span>
              <h4 className="mt-5 text-[1.25rem] font-extrabold">Thank you!</h4>
              <p className="mt-2 text-[0.95rem] text-ink/60">
                We've received your details. Our team will reach out to you shortly.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-7 rounded-[11px] bg-accent px-9 py-3 font-semibold text-white transition hover:bg-accent-2"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="mb-6 text-[0.95rem] text-ink/60">
                Leave your details and we'll get back to you about SchoolLID.
              </p>

              {error && (
                <div className="mb-5 rounded-[10px] border border-[#e11d48]/25 bg-[#e11d48]/[0.06] px-4 py-3 text-[0.88rem] text-[#b91c1c]">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit}>
                <div className="grid grid-cols-1 gap-y-[22px]">
                  {fields.map((f) => (
                    <div key={f.name} className="flex flex-col gap-2.5">
                      <label htmlFor={`enq-${f.name}`} className="text-[0.92rem] font-semibold">
                        {f.label} <span className="ml-0.5 text-accent">*</span>
                      </label>
                      <input
                        id={`enq-${f.name}`}
                        type={f.type ?? 'text'}
                        placeholder={f.placeholder}
                        required
                        value={form[f.name]}
                        onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                        className="rounded-[10px] border border-[#d7dde5] px-4 py-3 text-[0.95rem] text-ink outline-none transition placeholder:text-[#9aa6b2] focus:border-accent focus:shadow-[0_0_0_3px_rgba(86,170,58,.13)]"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex justify-end">
                  <button
                    type="submit"
                    data-hover
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-[11px] bg-accent px-9 py-3 text-[0.95rem] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-accent-2 hover:shadow-[0_12px_28px_rgba(86,170,58,.35)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                    {submitting ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

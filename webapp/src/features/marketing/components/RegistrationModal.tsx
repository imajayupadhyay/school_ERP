import { useEffect } from 'react'

interface RegistrationModalProps {
  open: boolean
  onClose: () => void
}

interface FieldDef {
  label: string
  placeholder: string
  type?: string
  required?: boolean
  full?: boolean
}

const fields: FieldDef[] = [
  { label: 'Name', placeholder: 'Enter Your School Name', required: true },
  { label: 'Email', placeholder: 'Enter Your School Email', type: 'email', required: true },
  { label: 'Mobile', placeholder: 'Enter Your School Mobile Number', type: 'tel', required: true },
  { label: 'Address', placeholder: 'Enter Your School Address', required: true },
  { label: 'Tagline', placeholder: 'Tagline', required: true, full: true },
  { label: 'CBSE Board Number', placeholder: 'CBSE Board Number' },
]

export default function RegistrationModal({ open, onClose }: RegistrationModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    addEventListener('keydown', onKey)
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <div
      className={`mk-modal fixed inset-0 z-[11000] items-center justify-center p-5 ${open ? 'open flex' : 'hidden'}`}
      aria-hidden={!open}
    >
      <div className="mk-modal-overlay absolute inset-0 bg-ink/60 backdrop-blur-md" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-title"
        className="mk-modal-card relative z-[1] bg-white text-ink w-[min(920px,100%)] max-h-[90vh] overflow-y-auto rounded-[20px] shadow-[0_40px_100px_rgba(0,0,0,.45)]"
      >
        <div className="flex items-center justify-between px-5 md:px-[34px] py-6 border-b border-[#e8ebef]">
          <h3 id="trial-title" className="text-[clamp(1.3rem,3vw,1.6rem)] font-extrabold tracking-[-0.02em]">
            Registration Form
          </h3>
          <button
            type="button"
            data-hover
            aria-label="Close"
            onClick={onClose}
            className="w-[42px] h-[42px] rounded-full grid place-items-center text-[#64748b] transition hover:bg-[#f1f3f6] hover:text-accent hover:rotate-90"
          >
            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 md:px-[34px] pt-7 pb-8">
          <span className="relative inline-block text-[1.1rem] font-bold pb-[9px] mb-[30px] border-b-[3px] border-ink">
            Create School
            <span className="absolute right-[-3px] bottom-[-4.5px] w-[7px] h-[7px] rounded-full bg-accent" />
          </span>

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[26px] gap-y-[22px]">
              {fields.map((f) => (
                <div key={f.label} className={`flex flex-col gap-2.5 ${f.full ? 'md:col-span-2' : ''}`}>
                  <label className="text-[0.92rem] font-semibold">
                    {f.label} {f.required && <span className="text-accent ml-0.5">*</span>}
                  </label>
                  <input
                    type={f.type ?? 'text'}
                    placeholder={f.placeholder}
                    required={f.required}
                    className="px-4 py-3 border border-[#d7dde5] rounded-[10px] text-[0.95rem] text-ink outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(86,170,58,.13)] placeholder:text-[#9aa6b2]"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-8">
              <button
                type="submit"
                data-hover
                className="bg-accent text-white border-none px-9 py-3 rounded-[11px] font-semibold text-[0.95rem] transition hover:bg-accent-2 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(86,170,58,.35)]"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { usePlatformAuth } from './PlatformAuthContext'
import {
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowIcon,
  ShieldCheckIcon,
} from './icons'
import '../platform-theme.css'

const capabilities = [
  'Onboard & manage every school tenant',
  'Plans, subscriptions & billing control',
  'Platform-wide reporting & audit trail',
]

export default function PlatformLoginPage() {
  const { signIn } = usePlatformAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/platform'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await signIn({ email: email.trim(), password })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      let message = 'Something went wrong. Please try again.'
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
        message =
          data?.errors?.email?.[0] ??
          data?.message ??
          (err.response?.status === 422 ? 'These credentials do not match our records.' : message)
      }
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="platform-theme min-h-screen grid lg:grid-cols-[46%_54%] bg-ink font-sans">
      {/* ---------- Left brand panel ---------- */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-paper bg-[linear-gradient(160deg,#0a1024_0%,#181a44_55%,#2a1f63_100%)]">
        <div className="absolute -top-40 -right-24 h-[460px] w-[460px] rounded-full blur-[110px] bg-[radial-gradient(circle,rgba(109,95,227,.42),transparent_70%)]" />
        <div className="absolute -bottom-32 -left-16 h-[380px] w-[380px] rounded-full blur-[110px] bg-[radial-gradient(circle,rgba(81,69,205,.3),transparent_70%)]" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
          <defs>
            <pattern id="plat-grid" width="34" height="34" patternUnits="userSpaceOnUse">
              <path d="M34 0H0V34" stroke="rgba(247,247,251,.5)" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#plat-grid)" />
        </svg>

        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-white shadow-lg">
            <ShieldCheckIcon width={22} height={22} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">SchoolLID <span className="font-light opacity-70">Platform</span></span>
        </div>

        <div className="relative z-10 max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-paper/20 bg-accent/[0.12] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.25em] opacity-85">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-2" /> Super Admin Console
          </span>
          <h2 className="mt-7 text-[clamp(2rem,3.2vw,2.9rem)] font-black leading-[1.07] tracking-[-0.03em]">
            Run the whole <span className="italic font-medium text-accent-2">platform</span> from one console.
          </h2>
          <ul className="mt-9 space-y-4">
            {capabilities.map((v) => (
              <li key={v} className="flex items-center gap-3.5 text-[0.98rem] font-light opacity-90">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/90 text-white">
                  <ShieldCheckIcon width={13} height={13} />
                </span>
                {v}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[0.78rem] text-paper/45">
          Restricted access. Platform administrators only.
        </p>
      </aside>

      {/* ---------- Right form panel ---------- */}
      <main className="flex items-center justify-center bg-paper px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white">
              <ShieldCheckIcon width={20} height={20} />
            </span>
            <span className="text-base font-extrabold text-ink">SchoolLID Platform</span>
          </div>

          <h1 className="text-[2rem] font-black tracking-[-0.03em] text-ink">Secure Sign In</h1>
          <p className="mt-2 text-ink/60">Access the platform super admin console.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-[#e11d48]/25 bg-[#e11d48]/[0.06] px-4 py-3 text-[0.88rem] text-[#b91c1c]"
              >
                {error}
              </div>
            )}

            <Field
              id="email"
              label="Email Address"
              type="email"
              autoComplete="username"
              placeholder="you@schoollid.com"
              icon={<MailIcon />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Field
              id="password"
              label="Password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              icon={<LockIcon />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={
                <button
                  type="button"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPw((s) => !s)}
                  className="rounded-lg p-2 text-ink/45 transition hover:bg-paper-2 hover:text-accent"
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />

            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent py-3.5 text-[0.97rem] font-semibold text-white transition hover:bg-accent-2 hover:shadow-[0_14px_34px_rgba(81,69,205,.4)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:shadow-none"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowIcon className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[0.8rem] text-ink/45">
            This is a restricted area. Unauthorized access is monitored.
          </p>
        </div>
      </main>
    </div>
  )
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  icon: React.ReactNode
  trailing?: React.ReactNode
}

function Field({ id, label, icon, trailing, ...props }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.85rem] font-semibold text-ink/75">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3.5 text-ink/35">{icon}</span>
        <input
          id={id}
          className="w-full rounded-xl border border-line bg-white py-3 pl-11 pr-11 text-[0.95rem] text-ink outline-none transition placeholder:text-ink/30 focus:border-accent focus:ring-4 focus:ring-accent/15"
          required
          {...props}
        />
        {trailing && <span className="absolute right-2">{trailing}</span>}
      </div>
    </div>
  )
}

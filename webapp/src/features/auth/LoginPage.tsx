import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import AuthField from './components/AuthField'
import { useAuth } from './AuthContext'
import {
  MailIcon,
  LockIcon,
  SchoolIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowIcon,
  CheckIcon,
} from './components/icons'
const valueProps = ['Attendance, fees & exams in one place', 'Real-time parent communication', 'Enterprise-grade data security']

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await signIn({ school_code: schoolCode.trim(), email: email.trim(), password, remember })
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
    <div className="min-h-screen grid lg:grid-cols-[45%_55%] bg-paper font-sans">
      {/* ---------- Left brand panel ---------- */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-paper bg-[linear-gradient(155deg,#0f3a31_0%,#1c4d42_55%,#0f3a31_100%)]">
        {/* decorative glows + grid */}
        <div className="absolute -top-40 -right-24 w-[460px] h-[460px] rounded-full blur-[100px] bg-[radial-gradient(circle,rgba(86,170,58,.4),transparent_70%)]" />
        <div className="absolute -bottom-32 -left-16 w-[380px] h-[380px] rounded-full blur-[100px] bg-[radial-gradient(circle,rgba(116,195,74,.22),transparent_70%)]" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.12]" aria-hidden>
          <defs>
            <pattern id="login-grid" width="34" height="34" patternUnits="userSpaceOnUse">
              <path d="M34 0H0V34" stroke="rgba(247,244,236,.5)" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-grid)" />
        </svg>

        <Link to="/" className="relative z-10 w-fit">
          <img src="/brand/schoollid-logo-full.png" alt="SchoolLID" className="h-11 w-auto" />
        </Link>

        <div className="relative z-10 max-w-md">
          <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase font-medium opacity-85 px-4 py-2 rounded-full border border-paper/20 bg-accent/[0.08]">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" /> School ERP Platform
          </span>
          <h2 className="mt-7 text-[clamp(2rem,3.4vw,3.1rem)] font-black leading-[1.05] tracking-[-0.03em]">
            Your school's <span className="italic font-medium text-accent">command center</span>, ready when you are.
          </h2>
          <ul className="mt-9 space-y-4">
            {valueProps.map((v) => (
              <li key={v} className="flex items-center gap-3.5 text-[0.98rem] font-light opacity-90">
                <span className="w-7 h-7 rounded-full bg-accent/90 text-white grid place-items-center shrink-0">
                  <CheckIcon width={13} height={13} />
                </span>
                {v}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex gap-9">
          {[
            ['150+', 'Schools'],
            ['99%', 'Uptime'],
            ['24/7', 'Support'],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-2xl font-extrabold text-accent-2 tracking-[-0.03em]">{n}</div>
              <div className="text-[0.7rem] tracking-[0.14em] uppercase opacity-55 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* ---------- Right form panel ---------- */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* mobile logo */}
          <Link to="/" className="lg:hidden mb-8 inline-block">
            <img src="/brand/schoollid-mark.png" alt="SchoolLID" className="h-12 w-auto" />
          </Link>

          <h1 className="text-[2rem] font-black tracking-[-0.03em] text-ink">Welcome Back</h1>
          <p className="mt-2 text-ink/60">Sign in to continue to your dashboard.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-[#e11d48]/25 bg-[#e11d48]/[0.06] px-4 py-3 text-[0.88rem] text-[#b91c1c]"
              >
                {error}
              </div>
            )}

            <AuthField
              id="email"
              label="Email Address"
              type="email"
              autoComplete="username"
              placeholder="you@yourschool.com"
              icon={<MailIcon />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <AuthField
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
                  className="p-2 rounded-lg text-ink/45 hover:text-accent hover:bg-paper-2 transition"
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />

            <AuthField
              id="school_code"
              label="School Code"
              type="text"
              placeholder="SCH-XXXX"
              icon={<SchoolIcon />}
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setRemember((r) => !r)}
                className="flex items-center gap-2.5 text-[0.88rem] text-ink/70 select-none"
              >
                <span
                  className={`w-[18px] h-[18px] rounded-[6px] grid place-items-center border transition ${
                    remember ? 'bg-accent border-accent text-white' : 'border-line bg-white text-transparent'
                  }`}
                >
                  <CheckIcon width={11} height={11} />
                </span>
                Remember me
              </button>
              <a href="#" className="text-[0.88rem] font-semibold text-accent hover:text-accent-2 transition">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-accent text-white font-semibold py-3.5 text-[0.97rem] transition hover:bg-accent-2 hover:shadow-[0_14px_34px_rgba(86,170,58,.35)] active:translate-y-px disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
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

          <p className="mt-5 rounded-xl bg-paper-2/70 px-4 py-3 text-center text-[0.8rem] text-ink/55">
            Demo access — code <span className="font-semibold text-ink/80">Demo</span>, email{' '}
            <span className="font-semibold text-ink/80">demo@gmail.com</span>, password{' '}
            <span className="font-semibold text-ink/80">Demo@123</span>
          </p>

          <p className="mt-8 text-center text-[0.9rem] text-ink/60">
            New to SchoolLID?{' '}
            <Link to="/#contact" className="font-semibold text-accent hover:text-accent-2 transition">
              Register your school
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

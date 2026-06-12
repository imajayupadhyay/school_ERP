import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * Route-level guard. Renders the children only when the current user holds the
 * given permission; otherwise shows a permission-denied panel. Owners bypass.
 */
export default function RequirePermission({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  const { can } = useAuth()

  if (can(permission)) {
    return <>{children}</>
  }

  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-20 text-center shadow-sm">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#dc2626]/10 text-[#dc2626]">
        <svg viewBox="0 0 24 24" width={30} height={30} fill="currentColor" aria-hidden>
          <path d="M12 1 4 4v7c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V4l-8-3Zm0 6a2 2 0 0 1 2 2v1a2 2 0 0 1-4 0V9a2 2 0 0 1 2-2Zm-3 7h6a1 1 0 0 1 1 1v2H8v-2a1 1 0 0 1 1-1Z" />
        </svg>
      </span>
      <h3 className="mt-4 text-[1.1rem] font-bold text-ink">Access restricted</h3>
      <p className="mt-1 max-w-sm text-[0.88rem] text-ink/55">
        You don’t have permission to view this section. Contact your school administrator if you
        believe this is a mistake.
      </p>
      <Link
        to="/admin"
        className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2"
      >
        Back to dashboard
      </Link>
    </div>
  )
}

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

/** Gate for authenticated areas. Redirects to /login while unauthenticated. */
export default function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <div className="min-h-screen grid place-items-center bg-paper">
        <div className="flex flex-col items-center gap-3 text-ink/60">
          <span className="h-9 w-9 rounded-full border-2 border-ink/15 border-t-accent animate-spin" />
          <span className="text-sm">Loading your workspace…</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

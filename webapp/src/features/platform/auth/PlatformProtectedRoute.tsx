import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { usePlatformAuth } from './PlatformAuthContext'

/** Gate for the platform panel. Redirects to the secure login while unauthenticated. */
export default function PlatformProtectedRoute() {
  const { isAuthenticated, initializing } = usePlatformAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <div className="platform-theme min-h-screen grid place-items-center bg-paper">
        <div className="flex flex-col items-center gap-3 text-ink/60">
          <span className="h-9 w-9 rounded-full border-2 border-ink/15 border-t-accent animate-spin" />
          <span className="text-sm">Loading platform console…</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/schoollid-secure-login" replace state={{ from: location }} />
  }

  return <Outlet />
}

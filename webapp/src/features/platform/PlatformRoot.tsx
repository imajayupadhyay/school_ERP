import { Outlet } from 'react-router-dom'
import { PlatformAuthProvider } from './auth/PlatformAuthContext'

/**
 * Wraps every platform route (login + protected) in its own auth provider,
 * keeping the platform session fully isolated from the school AuthProvider.
 */
export default function PlatformRoot() {
  return (
    <PlatformAuthProvider>
      <Outlet />
    </PlatformAuthProvider>
  )
}

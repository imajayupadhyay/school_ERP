import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { authStorage } from '@/lib/api'
import * as authApi from './api'
import type { LoginPayload, User } from './types'

interface AuthContextValue {
  user: User | null
  /** True while we are rehydrating an existing token on first load. */
  initializing: boolean
  isAuthenticated: boolean
  /** True if the current user holds the given permission key (owners → always true). */
  can: (permission: string) => boolean
  signIn: (payload: LoginPayload) => Promise<User>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)

  // Rehydrate the session from a stored token on app load.
  useEffect(() => {
    let active = true
    const token = authStorage.getToken()
    if (!token) {
      setInitializing(false)
      return
    }
    authApi
      .fetchMe()
      .then((me) => {
        if (active) setUser(me)
      })
      .catch(() => {
        authStorage.clearToken()
        authStorage.clearSchoolCode()
      })
      .finally(() => {
        if (active) setInitializing(false)
      })
    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback(async (payload: LoginPayload) => {
    const { token, user: loggedIn } = await authApi.login(payload)
    authStorage.setToken(token)
    authStorage.setSchoolCode(payload.school_code)
    setUser(loggedIn)
    return loggedIn
  }, [])

  const can = useCallback(
    (permission: string) => {
      const perms = user?.permissions
      if (!perms) return false
      return perms.includes('*') || perms.includes(permission)
    },
    [user],
  )

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Even if the network call fails, clear the local session.
    }
    authStorage.clearToken()
    authStorage.clearSchoolCode()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, initializing, isAuthenticated: !!user, can, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

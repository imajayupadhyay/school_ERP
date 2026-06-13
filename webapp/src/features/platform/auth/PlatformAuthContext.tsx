import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { platformAuthStorage } from '@/lib/platformApi'
import * as platformAuthApi from './api'
import type { PlatformLoginPayload, PlatformUser } from './types'

interface PlatformAuthContextValue {
  user: PlatformUser | null
  /** True while we are rehydrating an existing token on first load. */
  initializing: boolean
  isAuthenticated: boolean
  signIn: (payload: PlatformLoginPayload) => Promise<PlatformUser>
  signOut: () => Promise<void>
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null)

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null)
  // Only "initializing" if there is a stored token worth rehydrating.
  const [initializing, setInitializing] = useState(() => !!platformAuthStorage.getToken())

  // Rehydrate the session from a stored token on load.
  useEffect(() => {
    let active = true
    const token = platformAuthStorage.getToken()
    if (!token) return
    platformAuthApi
      .fetchPlatformMe()
      .then((me) => {
        if (active) setUser(me)
      })
      .catch(() => {
        platformAuthStorage.clearToken()
      })
      .finally(() => {
        if (active) setInitializing(false)
      })
    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback(async (payload: PlatformLoginPayload) => {
    const { token, user: loggedIn } = await platformAuthApi.platformLogin(payload)
    platformAuthStorage.setToken(token)
    setUser(loggedIn)
    return loggedIn
  }, [])

  const signOut = useCallback(async () => {
    try {
      await platformAuthApi.platformLogout()
    } catch {
      // Clear the local session even if the network call fails.
    }
    platformAuthStorage.clearToken()
    setUser(null)
  }, [])

  return (
    <PlatformAuthContext.Provider
      value={{ user, initializing, isAuthenticated: !!user, signIn, signOut }}
    >
      {children}
    </PlatformAuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlatformAuth(): PlatformAuthContextValue {
  const ctx = useContext(PlatformAuthContext)
  if (!ctx) throw new Error('usePlatformAuth must be used within a PlatformAuthProvider')
  return ctx
}

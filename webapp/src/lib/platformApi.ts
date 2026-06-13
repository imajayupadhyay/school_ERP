import axios, { type InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL } from './api'

/**
 * Dedicated Axios client for the Platform Super Admin panel.
 *
 * Kept separate from the school `api` client on purpose:
 * - It uses its OWN token key, so a platform owner session and a school
 *   session can coexist in the same browser without clobbering each other.
 * - It never sends the tenant `school-code` header — the platform is
 *   cross-tenant by design.
 *
 * Every platform feature imports THIS client — never the school `api`.
 */
const PLATFORM_TOKEN_KEY = 'schoollid.platform_token'

export const platformAuthStorage = {
  getToken: () => localStorage.getItem(PLATFORM_TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(PLATFORM_TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(PLATFORM_TOKEN_KEY),
}

export const platformApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
})

platformApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = platformAuthStorage.getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

platformApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      platformAuthStorage.clearToken()
    }
    return Promise.reject(error)
  },
)

import axios, { type InternalAxiosRequestConfig } from 'axios'

/**
 * One shared Axios client for the whole app.
 * - Injects the Sanctum bearer token and the tenant `school-code` header.
 * - Unwraps the backend's `{ error, message, data }` envelope at call sites.
 *
 * Every feature imports THIS client — never create another axios instance.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'

const TOKEN_KEY = 'schoollid.token'
const SCHOOL_CODE_KEY = 'schoollid.school_code'

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  getSchoolCode: () => localStorage.getItem(SCHOOL_CODE_KEY),
  setSchoolCode: (c: string) => localStorage.setItem(SCHOOL_CODE_KEY, c),
  clearSchoolCode: () => localStorage.removeItem(SCHOOL_CODE_KEY),
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStorage.getToken()
  const schoolCode = authStorage.getSchoolCode()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  if (schoolCode) config.headers.set('school-code', schoolCode)
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      authStorage.clearToken()
      // Optionally redirect to login here once the router is wired.
    }
    return Promise.reject(error)
  },
)

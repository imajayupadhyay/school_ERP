import axios from 'axios'

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message ?? 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

import type { SVGProps } from 'react'

// Reuse the shared auth login icon set for visual consistency on the login surface.
export { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowIcon } from '@/features/auth/components/icons'

export const ShieldCheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

import type { SVGProps } from 'react'

/**
 * Solid-fill icon set for the admin shell (brand rule: solid icons, no outlines).
 * All icons paint with `currentColor` so colour is controlled by text colour.
 */
type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  width: 20,
  height: 20,
  'aria-hidden': true,
  ...props,
})

export const DashboardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM13 10h8v11h-8V10ZM3 13h8v8H3v-8Z" />
  </svg>
)

export const StudentsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 1 8l11 5 9-4.09V15h2V8L12 3ZM5 13.18v3.5C5 18.66 8.13 20 12 20s7-1.34 7-3.32v-3.5l-7 3.18-7-3.18Z" />
  </svg>
)

export const TeachersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h9v-2.5c0-.85.33-2.34 2.37-3.47C10.5 13.1 9.66 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
  </svg>
)

export const ClassesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 4h12a2 2 0 0 1 2 2v14l-5-3-5 3V6H4V4Zm14 2v11.36l2 1.2V6a2 2 0 0 0-2-2v2Z" />
  </svg>
)

export const AttendanceIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 16H5V9h14v10Zm-8.3-1.3 5.7-5.7-1.4-1.4-4.3 4.29-1.7-1.7-1.4 1.41 3.1 3.1Z" />
  </svg>
)

export const FeesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 7H3a1 1 0 0 0-1 1v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1Zm-9 9a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7ZM4 6h16l-1.5-2.4a1 1 0 0 0-1.2-.4L4 6Z" />
  </svg>
)

export const ExamsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 3h-4.18A3 3 0 0 0 9.18 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM8 17H6v-2h2v2Zm0-4H6v-2h2v2Zm0-4H6V7h2v2Zm10 8h-7v-2h7v2Zm0-4h-7v-2h7v2Zm0-4h-7V7h7v2Z" />
  </svg>
)

export const NoticesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10v4a1 1 0 0 0 1 1h2l4 4V6L6 9H4a1 1 0 0 0-1 1Zm12.5 2a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 15.5 12ZM13 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54Z" />
  </svg>
)

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19.14 12.94a7.78 7.78 0 0 0 0-1.88l2-1.55-2-3.46-2.4 1a7.6 7.6 0 0 0-1.62-.94L14.7 2.5h-3.4l-.42 2.61c-.57.23-1.12.54-1.62.94l-2.4-1-2 3.46 2 1.55a7.78 7.78 0 0 0 0 1.88l-2 1.55 2 3.46 2.4-1c.5.4 1.05.71 1.62.94l.42 2.61h3.4l.42-2.61c.57-.23 1.12-.54 1.62-.94l2.4 1 2-3.46-2-1.55ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
  </svg>
)

export const LogoutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M16 13v-2H7V8l-5 4 5 4v-3h9ZM20 3h-8a2 2 0 0 0-2 2v4h2V5h8v14h-8v-4h-2v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
  </svg>
)

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.49 19l-5-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
  </svg>
)

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z" />
  </svg>
)

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41Z" />
  </svg>
)

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z" />
  </svg>
)

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L10.59 13.4 4.3 19.7 2.88 18.3 9.17 12 2.88 5.71 4.3 4.29l6.29 6.3 6.29-6.3 1.42 1.42Z" />
  </svg>
)

export const TrendUpIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m3.5 18.49 6-6.01 4 4L22 6.92 20.59 5.5l-7.09 7.97-4-4L2 16.99l1.5 1.5Z" />
  </svg>
)

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z" />
  </svg>
)

export const SectionsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z" />
  </svg>
)

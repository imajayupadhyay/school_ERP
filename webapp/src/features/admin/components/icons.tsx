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

export const ParentsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6.5 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM9 13c-3.31 0-6 1.57-6 3.5V20h12v-3.5C15 14.57 12.31 13 9 13Zm6.5.5c-.75 0-1.45.08-2.09.23 1.56.79 2.59 1.96 2.59 3.27V20h5v-3c0-1.93-2.46-3.5-5.5-3.5Z" />
  </svg>
)

export const ClassesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 4h12a2 2 0 0 1 2 2v14l-5-3-5 3V6H4V4Zm14 2v11.36l2 1.2V6a2 2 0 0 0-2-2v2Z" />
  </svg>
)

export const UploadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 20h14v-2H5v2Zm7-16-5.5 5.5 1.41 1.41L11 7.83V16h2V7.83l3.09 3.08L17.5 9.5 12 4Z" />
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

export const HomeworkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 3h11.5L21 7.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm10 1.5V9h4.5L15 4.5ZM7 11h10V9H7v2Zm0 4h10v-2H7v2Zm0 4h6v-2H7v2Z" />
  </svg>
)

export const ReportsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 13h3V9H6v7Zm5 0h3V6h-3v10Zm5 0h3v-5h-3v5Z" />
  </svg>
)

export const AuditIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2 4 5v6c0 5.1 3.44 9.74 8 11 4.56-1.26 8-5.9 8-11V5l-8-3Zm-1 5h2v5h-2V7Zm0 7h2v2h-2v-2Z" />
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

/** Solid double-chevron used for the sidebar collapse toggle. Rotate 180° to point right. */
export const ChevronsLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M11.41 7.41 10 6l-6 6 6 6 1.41-1.41L6.83 12l4.58-4.59Zm7 0L17 6l-6 6 6 6 1.41-1.41L13.83 12l4.58-4.59Z" />
  </svg>
)

/** Solid panel icon for the topbar sidebar toggle. */
export const PanelLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4Zm5 2v14h11V5H9Z" />
  </svg>
)

export const EyeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5c-5 0-9.27 3.11-11 7.5C2.73 16.89 7 20 12 20s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5Zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
  </svg>
)

export const EditIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
  </svg>
)

export const TransferIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3ZM21 9l-3.99-4v3H10v2h7.01v3L21 9Z" />
  </svg>
)

export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9.4 4 7.6 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.6L14.6 4H9.4ZM12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
  </svg>
)

export const ArchiveIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 3h18v4H3V3Zm1 6h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Zm5 3v2h6v-2H9Z" />
  </svg>
)

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 20h14v-2H5v2Zm7-3 5.5-5.5-1.41-1.42L13 13.17V4h-2v9.17L7.91 10.08 6.5 11.5 12 17Z" />
  </svg>
)

export const GraduationIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3ZM5 13.18v3.5C5 18.66 8.13 20 12 20s7-1.34 7-3.32v-3.5l-7 3.82-7-3.82Z" />
  </svg>
)

export const FilterIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 5h18v2.5l-7 7V21l-4-2v-6.5l-7-7V5Z" />
  </svg>
)

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59Z" />
  </svg>
)

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41Z" />
  </svg>
)

export const UsersGroupIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5Z" />
  </svg>
)

export const TagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21.41 11.58 12.41 2.58A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.42l9 9a2 2 0 0 0 2.82 0l7-7a2 2 0 0 0 0-2.84ZM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8Z" />
  </svg>
)

export const LayersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2 1 8l11 6 11-6-11-6Zm0 13.5L3.2 10.7 1 12l11 6 11-6-2.2-1.2L12 15.5Z" />
  </svg>
)

export const ReceiptIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 2v20l2-1.5L9 22l2-1.5L13 22l2-1.5L17 22l2-1.5L21 22V2l-2 1.5L17 2l-2 1.5L13 2l-2 1.5L9 2 7 3.5 5 2Zm3 6h8v2H8V8Zm0 4h8v2H8v-2Z" />
  </svg>
)

export const ChartBarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 13h3v8H4v-8Zm6.5-6h3v14h-3V7ZM17 10h3v11h-3V10ZM3 3h18v2H3V3Z" />
  </svg>
)

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 8v9H5v-9h14Z" />
  </svg>
)

export const BookIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2h13a1 1 0 0 1 1 1v15H7a1 1 0 0 0 0 2h13v2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 4v2h8V6H9Z" />
  </svg>
)

export const StarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" />
  </svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 16.17 4.83 12 3.41 13.41 9 19 21 7l-1.41-1.41L9 16.17Z" />
  </svg>
)

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7Zm3.5 2v9h1.5V9H9.5Zm3.5 0v9h1.5V9H13ZM15.5 4 14.5 3h-5L8.5 4H5v2h14V4h-3.5Z" />
  </svg>
)

export const ClipboardUserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1Zm3 2.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM12 11a2.4 2.4 0 1 0 0 4.8A2.4 2.4 0 0 0 12 11Zm-4 8c0-1.8 2-2.7 4-2.7s4 .9 4 2.7v.5H8V19Z" />
  </svg>
)

export const KeyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12.65 10A6 6 0 1 0 7 14a5.93 5.93 0 0 0 2.65-.62L11 15h2v2h2v2h3l3-3-7.35-7.35ZM7 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
  </svg>
)

export const LinkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7h-4a5 5 0 0 0 0 10h4v-1.9h-4A3.1 3.1 0 0 1 3.9 12ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10Z" />
  </svg>
)

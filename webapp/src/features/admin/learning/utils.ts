import type { MaterialType } from './types'

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  document: 'Document',
  video: 'Video',
  link: 'Link',
  note: 'Note',
  worksheet: 'Worksheet',
}

export function todayInputValue(): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

import type { AttendanceStatus, AttendanceStudentRecord, AttendanceSummary } from './types'

export const ATTENDANCE_STATUSES: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half day' },
  { value: 'excused', label: 'Excused' },
]

export function todayInputValue(): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

export function monthStartInputValue(): string {
  const date = new Date()
  date.setDate(1)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

export function summarizeRecords(records: AttendanceStudentRecord[]): AttendanceSummary {
  return {
    total: records.length,
    present: records.filter((record) => record.status === 'present').length,
    absent: records.filter((record) => record.status === 'absent').length,
    late: records.filter((record) => record.status === 'late').length,
    half_day: records.filter((record) => record.status === 'half_day').length,
    excused: records.filter((record) => record.status === 'excused').length,
  }
}

export function attendedCount(summary: AttendanceSummary): number {
  return summary.present + summary.late + summary.half_day + summary.excused
}

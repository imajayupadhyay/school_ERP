export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthStartInputValue(): string {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().slice(0, 10)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function moduleLabel(value: string | null | undefined): string {
  if (!value) return 'System'
  const labels: Record<string, string> = {
    academic_session: 'Sessions',
    class: 'Classes',
    section: 'Sections',
    subject: 'Subjects',
    school_profile: 'School Profile',
    employee: 'Employees',
    student: 'Students',
    guardian: 'Guardians',
    fee_head: 'Fee Heads',
    fee_structure: 'Fee Structures',
    student_fee: 'Student Fees',
    fee_payment: 'Payments',
    attendance: 'Attendance',
    homework: 'Homework',
    study_material: 'Study Material',
    exam: 'Exams',
    exam_schedule: 'Exam Schedules',
    exam_marks: 'Marks',
    exam_results: 'Results',
    notice: 'Notices',
  }
  return labels[value] ?? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value)
}

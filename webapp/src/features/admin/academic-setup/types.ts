export interface AcademicSession {
  id: number
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  status: string
}

export type AcademicSessionPayload = {
  name: string
  start_date: string
  end_date: string
  status?: string
}

export interface ClassSubjectRef {
  id: number
  name: string
}

export interface SchoolClass {
  id: number
  name: string
  sequence: number
  status: string
  sections: Section[]
  subjects: ClassSubjectRef[]
}

export type ClassPayload = {
  name: string
  sequence?: number
  status?: string
}

export interface Section {
  id: number
  class_id: number
  name: string
  capacity: number | null
  status: string
}

export type SectionPayload = {
  class_id: number
  name: string
  capacity?: number | null
  status?: string
}

export interface Subject {
  id: number
  name: string
  code: string | null
  type: string
  status: string
  classes: ClassSubjectRef[]
}

export type SubjectPayload = {
  name: string
  code?: string | null
  type?: string
  status?: string
}

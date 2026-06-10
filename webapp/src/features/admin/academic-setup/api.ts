import { api } from '@/lib/api'
import type {
  AcademicSession,
  AcademicSessionPayload,
  ClassPayload,
  Section,
  SectionPayload,
  SchoolClass,
  Subject,
  SubjectPayload,
} from './types'

// --- Academic Sessions ---

export async function fetchAcademicSessions(): Promise<AcademicSession[]> {
  const { data } = await api.get<{ data: AcademicSession[] }>('/academic-sessions')
  return data.data
}

export async function createAcademicSession(payload: AcademicSessionPayload): Promise<AcademicSession> {
  const { data } = await api.post<{ data: AcademicSession }>('/academic-sessions', payload)
  return data.data
}

export async function updateAcademicSession(
  id: number,
  payload: AcademicSessionPayload,
): Promise<AcademicSession> {
  const { data } = await api.put<{ data: AcademicSession }>(`/academic-sessions/${id}`, payload)
  return data.data
}

export async function deleteAcademicSession(id: number): Promise<void> {
  await api.delete(`/academic-sessions/${id}`)
}

export async function setCurrentAcademicSession(id: number): Promise<AcademicSession> {
  const { data } = await api.post<{ data: AcademicSession }>(`/academic-sessions/${id}/set-current`)
  return data.data
}

// --- Classes ---

export async function fetchClasses(): Promise<SchoolClass[]> {
  const { data } = await api.get<{ data: SchoolClass[] }>('/classes')
  return data.data
}

export async function createClass(payload: ClassPayload): Promise<SchoolClass> {
  const { data } = await api.post<{ data: SchoolClass }>('/classes', payload)
  return data.data
}

export async function updateClass(id: number, payload: ClassPayload): Promise<SchoolClass> {
  const { data } = await api.put<{ data: SchoolClass }>(`/classes/${id}`, payload)
  return data.data
}

export async function deleteClass(id: number): Promise<void> {
  await api.delete(`/classes/${id}`)
}

// --- Sections ---

export async function createSection(payload: SectionPayload): Promise<Section> {
  const { data } = await api.post<{ data: Section }>('/sections', payload)
  return data.data
}

export async function updateSection(id: number, payload: SectionPayload): Promise<Section> {
  const { data } = await api.put<{ data: Section }>(`/sections/${id}`, payload)
  return data.data
}

export async function deleteSection(id: number): Promise<void> {
  await api.delete(`/sections/${id}`)
}

// --- Subjects ---

export async function fetchSubjects(): Promise<Subject[]> {
  const { data } = await api.get<{ data: Subject[] }>('/subjects')
  return data.data
}

export async function createSubject(payload: SubjectPayload): Promise<Subject> {
  const { data } = await api.post<{ data: Subject }>('/subjects', payload)
  return data.data
}

export async function updateSubject(id: number, payload: SubjectPayload): Promise<Subject> {
  const { data } = await api.put<{ data: Subject }>(`/subjects/${id}`, payload)
  return data.data
}

export async function deleteSubject(id: number): Promise<void> {
  await api.delete(`/subjects/${id}`)
}

export async function syncSubjectClasses(id: number, classIds: number[]): Promise<Subject> {
  const { data } = await api.put<{ data: Subject }>(`/subjects/${id}/classes`, { class_ids: classIds })
  return data.data
}

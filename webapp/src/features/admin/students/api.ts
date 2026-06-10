import { api } from '@/lib/api'
import type {
  PromoteStudentsPayload,
  Student,
  StudentHistoryItem,
  StudentListParams,
  StudentListResponse,
  StudentPayload,
  TransferStudentPayload,
} from './types'

export async function fetchStudents(params: StudentListParams): Promise<StudentListResponse> {
  const { data } = await api.get<{ data: StudentListResponse }>('/students', { params })
  return data.data
}

export async function createStudent(payload: StudentPayload): Promise<Student> {
  const { data } = await api.post<{ data: Student }>('/students', payload)
  return data.data
}

export async function updateStudent(id: number, payload: StudentPayload): Promise<Student> {
  const { data } = await api.put<{ data: Student }>(`/students/${id}`, payload)
  return data.data
}

export async function archiveStudent(id: number): Promise<Student> {
  const { data } = await api.delete<{ data: Student }>(`/students/${id}`)
  return data.data
}

export async function transferStudent(id: number, payload: TransferStudentPayload): Promise<Student> {
  const { data } = await api.post<{ data: Student }>(`/students/${id}/transfer`, payload)
  return data.data
}

export async function promoteStudents(payload: PromoteStudentsPayload): Promise<{ count: number; student_ids: number[] }> {
  const { data } = await api.post<{ data: { count: number; student_ids: number[] } }>('/students/promote', payload)
  return data.data
}

export async function uploadStudentPhoto(id: number, photo: File): Promise<Student> {
  const formData = new FormData()
  formData.append('photo', photo)
  const { data } = await api.post<{ data: Student }>(`/students/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export async function fetchStudentHistory(id: number): Promise<StudentHistoryItem[]> {
  const { data } = await api.get<{ data: StudentHistoryItem[] }>(`/students/${id}/history`)
  return data.data
}

export async function exportStudents(params: Omit<StudentListParams, 'page' | 'per_page'>): Promise<Blob> {
  const { data } = await api.get('/students/export', { params, responseType: 'blob' })
  return data
}

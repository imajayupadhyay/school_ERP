import { api } from '@/lib/api'
import type {
  HomeworkAssignment,
  HomeworkListParams,
  HomeworkListResponse,
  HomeworkPayload,
  StudyMaterial,
  StudyMaterialListParams,
  StudyMaterialListResponse,
  StudyMaterialPayload,
} from './types'

export async function fetchHomework(params: HomeworkListParams): Promise<HomeworkListResponse> {
  const { data } = await api.get<{ data: HomeworkListResponse }>('/homework', { params })
  return data.data
}

export async function createHomework(payload: HomeworkPayload): Promise<HomeworkAssignment> {
  const { data } = await api.post<{ data: HomeworkAssignment }>('/homework', payload)
  return data.data
}

export async function updateHomework(id: number, payload: HomeworkPayload): Promise<HomeworkAssignment> {
  const { data } = await api.put<{ data: HomeworkAssignment }>(`/homework/${id}`, payload)
  return data.data
}

export async function archiveHomework(id: number): Promise<HomeworkAssignment> {
  const { data } = await api.delete<{ data: HomeworkAssignment }>(`/homework/${id}`)
  return data.data
}

export async function uploadHomeworkAttachment(id: number, file: File): Promise<HomeworkAssignment> {
  const formData = new FormData()
  formData.append('attachment', file)
  const { data } = await api.post<{ data: HomeworkAssignment }>(`/homework/${id}/attachment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export async function fetchStudyMaterials(params: StudyMaterialListParams): Promise<StudyMaterialListResponse> {
  const { data } = await api.get<{ data: StudyMaterialListResponse }>('/study-materials', { params })
  return data.data
}

export async function createStudyMaterial(payload: StudyMaterialPayload): Promise<StudyMaterial> {
  const { data } = await api.post<{ data: StudyMaterial }>('/study-materials', payload)
  return data.data
}

export async function updateStudyMaterial(id: number, payload: StudyMaterialPayload): Promise<StudyMaterial> {
  const { data } = await api.put<{ data: StudyMaterial }>(`/study-materials/${id}`, payload)
  return data.data
}

export async function archiveStudyMaterial(id: number): Promise<StudyMaterial> {
  const { data } = await api.delete<{ data: StudyMaterial }>(`/study-materials/${id}`)
  return data.data
}

export async function uploadStudyMaterialAttachment(id: number, file: File): Promise<StudyMaterial> {
  const formData = new FormData()
  formData.append('attachment', file)
  const { data } = await api.post<{ data: StudyMaterial }>(`/study-materials/${id}/attachment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

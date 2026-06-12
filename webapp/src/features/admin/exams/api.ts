import { api } from '@/lib/api'
import type {
  Exam,
  ExamPayload,
  ExamResult,
  ExamSchedule,
  ExamSchedulePayload,
  MarkRosterResponse,
  ResultScopePayload,
  SaveMarksPayload,
} from './types'

export async function fetchExams(params?: {
  search?: string
  academic_session_id?: number
  exam_type?: string
  status?: string
}): Promise<Exam[]> {
  const { data } = await api.get<{ data: Exam[] }>('/exams', { params })
  return data.data
}

export async function createExam(payload: ExamPayload): Promise<Exam> {
  const { data } = await api.post<{ data: Exam }>('/exams', payload)
  return data.data
}

export async function updateExam(id: number, payload: ExamPayload): Promise<Exam> {
  const { data } = await api.put<{ data: Exam }>(`/exams/${id}`, payload)
  return data.data
}

export async function archiveExam(id: number): Promise<Exam> {
  const { data } = await api.delete<{ data: Exam }>(`/exams/${id}`)
  return data.data
}

export async function fetchExamSchedules(params?: {
  exam_id?: number
  class_id?: number
  section_id?: number
  subject_id?: number
  status?: string
}): Promise<ExamSchedule[]> {
  const { data } = await api.get<{ data: ExamSchedule[] }>('/exam-schedules', { params })
  return data.data
}

export async function createExamSchedule(payload: ExamSchedulePayload): Promise<ExamSchedule> {
  const { data } = await api.post<{ data: ExamSchedule }>('/exam-schedules', payload)
  return data.data
}

export async function updateExamSchedule(id: number, payload: ExamSchedulePayload): Promise<ExamSchedule> {
  const { data } = await api.put<{ data: ExamSchedule }>(`/exam-schedules/${id}`, payload)
  return data.data
}

export async function deleteExamSchedule(id: number): Promise<void> {
  await api.delete(`/exam-schedules/${id}`)
}

export async function fetchMarkRoster(scheduleId: number): Promise<MarkRosterResponse> {
  const { data } = await api.get<{ data: MarkRosterResponse }>(`/exam-schedules/${scheduleId}/marks`)
  return data.data
}

export async function saveMarks(scheduleId: number, payload: SaveMarksPayload): Promise<MarkRosterResponse> {
  const { data } = await api.put<{ data: MarkRosterResponse }>(`/exam-schedules/${scheduleId}/marks`, payload)
  return data.data
}

export async function fetchExamResults(
  examId: number,
  params?: { class_id?: number; section_id?: number; status?: string },
): Promise<ExamResult[]> {
  const { data } = await api.get<{ data: ExamResult[] }>(`/exams/${examId}/results`, { params })
  return data.data
}

export async function fetchStudentResult(examId: number, studentId: number): Promise<ExamResult> {
  const { data } = await api.get<{ data: ExamResult }>(`/exams/${examId}/students/${studentId}/result`)
  return data.data
}

export async function publishResults(examId: number, payload: ResultScopePayload): Promise<{ count: number; result_ids: number[] }> {
  const { data } = await api.post<{ data: { count: number; result_ids: number[] } }>(
    `/exams/${examId}/results/publish`,
    payload,
  )
  return data.data
}

export async function unpublishResults(examId: number, payload: ResultScopePayload): Promise<{ count: number }> {
  const { data } = await api.post<{ data: { count: number } }>(`/exams/${examId}/results/unpublish`, payload)
  return data.data
}

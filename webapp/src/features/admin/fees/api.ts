import { api } from '@/lib/api'
import type {
  AssignFeePayload,
  CollectPaymentPayload,
  FeeHead,
  FeeHeadPayload,
  FeePayment,
  FeeStructure,
  FeeStructurePayload,
  FeeStudentListParams,
  FeeStudentListResponse,
  PaymentListResponse,
  StudentFeeItemPayload,
  StudentFeePlan,
} from './types'

// --- Fee heads ---

export async function fetchFeeHeads(params?: { search?: string; status?: string }): Promise<FeeHead[]> {
  const { data } = await api.get<{ data: FeeHead[] }>('/fee-heads', { params })
  return data.data
}

export async function createFeeHead(payload: FeeHeadPayload): Promise<FeeHead> {
  const { data } = await api.post<{ data: FeeHead }>('/fee-heads', payload)
  return data.data
}

export async function updateFeeHead(id: number, payload: FeeHeadPayload): Promise<FeeHead> {
  const { data } = await api.put<{ data: FeeHead }>(`/fee-heads/${id}`, payload)
  return data.data
}

export async function deleteFeeHead(id: number): Promise<void> {
  await api.delete(`/fee-heads/${id}`)
}

// --- Fee structures ---

export async function fetchFeeStructures(params?: {
  search?: string
  academic_session_id?: number
  class_id?: number
  status?: string
}): Promise<FeeStructure[]> {
  const { data } = await api.get<{ data: FeeStructure[] }>('/fee-structures', { params })
  return data.data
}

export async function fetchFeeStructure(id: number): Promise<FeeStructure> {
  const { data } = await api.get<{ data: FeeStructure }>(`/fee-structures/${id}`)
  return data.data
}

export async function createFeeStructure(payload: FeeStructurePayload): Promise<FeeStructure> {
  const { data } = await api.post<{ data: FeeStructure }>('/fee-structures', payload)
  return data.data
}

export async function updateFeeStructure(id: number, payload: FeeStructurePayload): Promise<FeeStructure> {
  const { data } = await api.put<{ data: FeeStructure }>(`/fee-structures/${id}`, payload)
  return data.data
}

export async function deleteFeeStructure(id: number): Promise<void> {
  await api.delete(`/fee-structures/${id}`)
}

// --- Student plans + collection ---

export async function fetchFeeStudents(params: FeeStudentListParams): Promise<FeeStudentListResponse> {
  const { data } = await api.get<{ data: FeeStudentListResponse }>('/fees/students', { params })
  return data.data
}

export async function fetchStudentPlan(studentId: number): Promise<StudentFeePlan> {
  const { data } = await api.get<{ data: StudentFeePlan }>(`/fees/students/${studentId}`)
  return data.data
}

export async function assignStudentFee(studentId: number, payload: AssignFeePayload): Promise<StudentFeePlan> {
  const { data } = await api.post<{ data: StudentFeePlan }>(`/fees/students/${studentId}/assign`, payload)
  return data.data
}

export async function updateStudentItems(studentId: number, items: StudentFeeItemPayload[]): Promise<StudentFeePlan> {
  const { data } = await api.put<{ data: StudentFeePlan }>(`/fees/students/${studentId}/items`, { items })
  return data.data
}

export async function cancelStudentPlan(studentId: number): Promise<StudentFeePlan> {
  const { data } = await api.post<{ data: StudentFeePlan }>(`/fees/students/${studentId}/cancel`)
  return data.data
}

export async function collectPayment(payload: CollectPaymentPayload): Promise<FeePayment> {
  const { data } = await api.post<{ data: FeePayment }>('/fee-payments', payload)
  return data.data
}

export async function voidPayment(id: number): Promise<FeePayment> {
  const { data } = await api.post<{ data: FeePayment }>(`/fee-payments/${id}/void`)
  return data.data
}

export async function fetchPayments(params: {
  page: number
  per_page: number
  search?: string
  student_id?: number
  mode?: string
  status?: string
}): Promise<PaymentListResponse> {
  const { data } = await api.get<{ data: PaymentListResponse }>('/fee-payments', { params })
  return data.data
}

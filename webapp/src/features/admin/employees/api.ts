import { api } from '@/lib/api'
import type {
  Employee,
  EmployeeAssignmentPayload,
  EmployeeListParams,
  EmployeeListResponse,
  EmployeePayload,
} from './types'

export async function fetchEmployees(params: EmployeeListParams): Promise<EmployeeListResponse> {
  const { data } = await api.get<{ data: EmployeeListResponse }>('/employees', { params })
  return data.data
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  const { data } = await api.post<{ data: Employee }>('/employees', payload)
  return data.data
}

export async function updateEmployee(id: number, payload: EmployeePayload): Promise<Employee> {
  const { data } = await api.put<{ data: Employee }>(`/employees/${id}`, payload)
  return data.data
}

export async function deleteEmployee(id: number): Promise<void> {
  await api.delete(`/employees/${id}`)
}

export async function syncEmployeeAssignments(
  id: number,
  assignments: EmployeeAssignmentPayload[],
): Promise<Employee> {
  const { data } = await api.put<{ data: Employee }>(`/employees/${id}/assignments`, { assignments })
  return data.data
}

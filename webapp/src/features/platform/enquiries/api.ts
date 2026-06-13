import { platformApi } from '@/lib/platformApi'
import type { Enquiry, EnquiryListParams, EnquiryListResult } from './types'

/** GET /platform/enquiries — paginated, searchable, status-filterable. */
export async function fetchEnquiries(params: EnquiryListParams): Promise<EnquiryListResult> {
  const { data } = await platformApi.get<{ data: EnquiryListResult }>('/platform/enquiries', { params })
  return data.data
}

/** POST /platform/enquiries/{id}/status — update a lead's status. */
export async function updateEnquiryStatus(id: number, status: string): Promise<Enquiry> {
  const { data } = await platformApi.post<{ data: Enquiry }>(`/platform/enquiries/${id}/status`, { status })
  return data.data
}

/** DELETE /platform/enquiries/{id} — remove a lead. */
export async function deleteEnquiry(id: number): Promise<void> {
  await platformApi.delete(`/platform/enquiries/${id}`)
}

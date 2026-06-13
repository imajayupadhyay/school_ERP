import type { PaginationMeta } from '../schools/types'

export interface Enquiry {
  id: number
  name: string
  email: string
  phone: string
  status: string
  note: string | null
  created_at: string | null
}

export interface EnquiryListMeta extends PaginationMeta {
  new_count: number
}

export interface EnquiryListResult {
  items: Enquiry[]
  meta: EnquiryListMeta
}

export interface EnquiryListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
}

export const ENQUIRY_STATUSES = ['new', 'contacted', 'converted', 'closed'] as const

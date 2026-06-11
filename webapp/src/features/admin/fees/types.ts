// --- Shared enums ---

export type Frequency = 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'annual'
export type DiscountType = 'none' | 'percent' | 'fixed'
export type PaymentMode = 'cash' | 'cheque' | 'online' | 'card' | 'upi' | 'bank_transfer'
export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'cancelled'

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  annual: 'Annual',
}

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  online: 'Online',
  card: 'Card',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
}

// --- Fee heads ---

export interface FeeHead {
  id: number
  name: string
  code: string | null
  description: string | null
  is_optional: boolean
  status: string
}

export interface FeeHeadPayload {
  name: string
  code?: string | null
  description?: string | null
  is_optional?: boolean
  status?: string
}

// --- Fee structures ---

export interface FeeStructureItem {
  id: number
  fee_head_id: number
  fee_head?: { id: number; name: string } | null
  amount: number
  frequency: Frequency
  is_optional: boolean
}

export interface FeeStructure {
  id: number
  academic_session_id: number
  class_id: number | null
  name: string
  description: string | null
  status: string
  academic_session?: { id: number; name: string } | null
  class?: { id: number; name: string } | null
  items?: FeeStructureItem[]
  items_count?: number
}

export interface FeeStructureItemPayload {
  fee_head_id: number
  amount: number
  frequency: Frequency
  is_optional?: boolean
}

export interface FeeStructurePayload {
  academic_session_id: number
  class_id?: number | null
  name: string
  description?: string | null
  status?: string
  items: FeeStructureItemPayload[]
}

// --- Student fee plan ---

export interface StudentFeeItem {
  id: number
  fee_head_id: number | null
  fee_head?: { id: number; name: string } | null
  label: string
  base_amount: number
  frequency: Frequency
  discount_type: DiscountType
  discount_value: number
  discount_reason: string | null
  net_amount: number
  is_custom: boolean
  is_optional: boolean
}

export interface FeeInvoiceItem {
  id: number
  fee_head_id: number | null
  label: string
  amount: number
}

export interface FeePayment {
  id: number
  student_id: number
  fee_invoice_id: number | null
  receipt_no: string
  amount: number
  mode: PaymentMode
  reference_no: string | null
  paid_on: string | null
  remarks: string | null
  status: string
  collected_by: number | null
  collector?: { id: number; name: string } | null
  invoice?: { id: number; invoice_no: string; period_label: string } | null
  created_at?: string
}

export interface FeeInvoice {
  id: number
  student_id: number
  student_fee_assignment_id: number
  invoice_no: string
  period_label: string
  due_date: string | null
  total_amount: number
  paid_amount: number
  balance: number
  status: InvoiceStatus
  is_overdue: boolean
  items?: FeeInvoiceItem[]
  payments?: FeePayment[]
}

export interface StudentFeePlan {
  student: {
    id: number
    admission_no: string | null
    full_name: string
    class_name: string | null
    section: string | null
    class_id: number | null
    academic_session_id: number | null
  }
  assignment: {
    id: number
    status: string
    notes: string | null
    fee_structure: { id: number; name: string } | null
    academic_session: { id: number; name: string } | null
    items: StudentFeeItem[]
  } | null
  invoices: FeeInvoice[]
  summary: {
    total_billed: number
    total_paid: number
    outstanding: number
    overdue_count: number
    invoice_count: number
  }
}

export interface StudentFeeItemPayload {
  fee_head_id?: number | null
  label: string
  base_amount: number
  frequency: Frequency
  discount_type?: DiscountType
  discount_value?: number
  discount_reason?: string | null
  is_custom?: boolean
  is_optional?: boolean
}

export interface AssignFeePayload {
  fee_structure_id: number
  discount_type?: DiscountType
  discount_value?: number
  discount_reason?: string | null
  notes?: string | null
}

export interface CollectPaymentPayload {
  fee_invoice_id: number
  amount: number
  mode: PaymentMode
  reference_no?: string | null
  paid_on?: string | null
  remarks?: string | null
}

// --- Lists ---

export interface ListMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface FeeStudentRow {
  id: number
  admission_no: string | null
  full_name: string
  class_name: string | null
  section: string | null
  class_id: number | null
  section_id: number | null
  status: string
  has_plan: boolean
  billed: number
  paid: number
  outstanding: number
  overdue_count: number
}

export interface FeeStudentListResponse {
  items: FeeStudentRow[]
  meta: ListMeta
}

export interface FeeStudentListParams {
  page: number
  per_page: number
  search?: string
  class_id?: number
  section_id?: number
  status?: string
}

export interface PaymentListResponse {
  items: FeePayment[]
  meta: ListMeta
}

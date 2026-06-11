import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import {
  assignStudentFee,
  cancelStudentPlan,
  collectPayment,
  fetchFeeHeads,
  fetchFeeStructures,
  fetchStudentPlan,
  updateStudentItems,
  voidPayment,
} from '../api'
import { formatINR } from '../format'
import {
  FREQUENCY_LABELS,
  type DiscountType,
  type FeeInvoice,
  type PaymentMode,
  type StudentFeeItemPayload,
} from '../types'
import CollectPaymentModal from './CollectPaymentModal'
import PlanEditorModal from './PlanEditorModal'

export default function StudentFeeDrawer({
  studentId,
  onClose,
  canEdit,
}: {
  studentId: number
  onClose: () => void
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const [payInvoice, setPayInvoice] = useState<FeeInvoice | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [receiptNote, setReceiptNote] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const { data: plan, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-plan', studentId],
    queryFn: () => fetchStudentPlan(studentId),
  })

  const { data: feeHeads = [] } = useQuery({ queryKey: ['fee-heads'], queryFn: () => fetchFeeHeads() })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['student-plan', studentId] })
    queryClient.invalidateQueries({ queryKey: ['fee-students'] })
  }

  const collectMutation = useMutation({
    mutationFn: collectPayment,
    onSuccess: (payment) => {
      setReceiptNote(`Payment recorded · Receipt ${payment.receipt_no}`)
      setPayInvoice(null)
      setPayError(null)
      refresh()
    },
    onError: (err) => setPayError(extractErrorMessage(err)),
  })

  const voidMutation = useMutation({
    mutationFn: voidPayment,
    onSuccess: () => {
      setActionError(null)
      refresh()
    },
    onError: (err) => setActionError(extractErrorMessage(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelStudentPlan(studentId),
    onSuccess: () => {
      setActionError(null)
      refresh()
    },
    onError: (err) => setActionError(extractErrorMessage(err)),
  })

  const editMutation = useMutation({
    mutationFn: (items: StudentFeeItemPayload[]) => updateStudentItems(studentId, items),
    onSuccess: () => {
      setEditError(null)
      setEditing(false)
      setReceiptNote('Fee plan updated · invoices regenerated')
      refresh()
    },
    onError: (err) => setEditError(extractErrorMessage(err)),
  })

  const title = plan ? plan.student.full_name : 'Student Fees'
  const subtitle = plan
    ? [plan.student.admission_no, plan.student.class_name, plan.student.section].filter(Boolean).join(' · ')
    : undefined

  return (
    <Modal title={title} description={subtitle} onClose={onClose} size="lg">
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-2xl bg-ink/5" />
      ) : isError || !plan ? (
        <div className="grid place-items-center py-16">
          <button onClick={() => refetch()} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white">
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {receiptNote && (
            <div className="rounded-xl border border-[#168A66]/30 bg-[#168A66]/10 px-4 py-2.5 text-[0.82rem] font-medium text-[#168A66]">
              {receiptNote}
            </div>
          )}
          {actionError && <p className="text-[0.82rem] font-medium text-[#dc2626]">{actionError}</p>}

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Billed" value={formatINR(plan.summary.total_billed)} />
            <SummaryCard label="Collected" value={formatINR(plan.summary.total_paid)} />
            <SummaryCard label="Outstanding" value={formatINR(plan.summary.outstanding)} accent />
            <SummaryCard label="Overdue" value={String(plan.summary.overdue_count)} danger={plan.summary.overdue_count > 0} />
          </div>

          {plan.assignment ? (
            <>
              {/* Plan items */}
              <section className="rounded-2xl border border-line bg-paper/35 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[0.72rem] font-semibold uppercase tracking-wider text-ink/45">
                    Fee Plan{plan.assignment.fee_structure ? ` · ${plan.assignment.fee_structure.name}` : ''}
                  </h3>
                  {canEdit && plan.assignment.status === 'active' && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditError(null)
                          setEditing(true)
                        }}
                        className="text-[0.76rem] font-semibold text-accent hover:underline"
                      >
                        Edit plan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Cancel this fee plan? Unpaid invoices will be cancelled.')) cancelMutation.mutate()
                        }}
                        className="text-[0.76rem] font-semibold text-[#dc2626] hover:underline"
                      >
                        Cancel plan
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  {plan.assignment.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[0.84rem]">
                      <span className="text-ink/75">
                        {item.label}
                        <span className="ml-2 text-[0.72rem] text-ink/40">{FREQUENCY_LABELS[item.frequency]}</span>
                        {item.is_custom && (
                          <span className="ml-2 rounded-full bg-lime/15 px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase text-lime">
                            Custom
                          </span>
                        )}
                        {item.discount_type !== 'none' && (
                          <span className="ml-2 text-[0.72rem] text-[#168A66]">
                            −{item.discount_type === 'percent' ? `${item.discount_value}%` : formatINR(item.discount_value)}
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-ink">{formatINR(item.net_amount)}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Invoices */}
              <section className="overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full text-left text-[0.83rem]">
                  <thead>
                    <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-wider text-ink/45">
                      <th className="px-4 py-2.5 font-semibold">Invoice</th>
                      <th className="px-4 py-2.5 font-semibold">Period</th>
                      <th className="px-4 py-2.5 font-semibold">Due</th>
                      <th className="px-4 py-2.5 font-semibold">Total</th>
                      <th className="px-4 py-2.5 font-semibold">Balance</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      {canEdit && <th className="px-4 py-2.5 text-right font-semibold">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {plan.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={canEdit ? 7 : 6} className="px-4 py-8 text-center text-ink/40">
                          No invoices generated.
                        </td>
                      </tr>
                    ) : (
                      plan.invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-line/60 last:border-0 hover:bg-paper/40">
                          <td className="px-4 py-2.5 font-medium text-ink">{invoice.invoice_no}</td>
                          <td className="px-4 py-2.5 text-ink/65">{invoice.period_label}</td>
                          <td className={`px-4 py-2.5 ${invoice.is_overdue ? 'font-semibold text-[#dc2626]' : 'text-ink/65'}`}>
                            {invoice.due_date ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-ink/65">{formatINR(invoice.total_amount)}</td>
                          <td className="px-4 py-2.5 font-medium text-ink">{formatINR(invoice.balance)}</td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={invoice.is_overdue ? 'overdue' : invoice.status} />
                          </td>
                          {canEdit && (
                            <td className="px-4 py-2.5 text-right">
                              {invoice.status !== 'paid' && invoice.status !== 'cancelled' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayError(null)
                                    setReceiptNote(null)
                                    setPayInvoice(invoice)
                                  }}
                                  className="rounded-lg bg-accent px-3 py-1.5 text-[0.76rem] font-semibold text-white transition hover:bg-accent-2"
                                >
                                  Collect
                                </button>
                              ) : (
                                <span className="text-[0.72rem] text-ink/35">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>

              {/* Payment history */}
              <PaymentHistory plan={plan} canEdit={canEdit} onVoid={(id) => voidMutation.mutate(id)} />
            </>
          ) : (
            <AssignPlanPanel studentId={studentId} classId={plan.student.class_id} canEdit={canEdit} onAssigned={refresh} />
          )}
        </div>
      )}

      {payInvoice && (
        <CollectPaymentModal
          invoice={payInvoice}
          onClose={() => {
            setPayInvoice(null)
            setPayError(null)
          }}
          onSubmit={(values) => collectMutation.mutate({ fee_invoice_id: payInvoice.id, ...values })}
          isSaving={collectMutation.isPending}
          error={payError}
        />
      )}

      {editing && plan?.assignment && (
        <PlanEditorModal
          items={plan.assignment.items}
          feeHeads={feeHeads}
          structureName={plan.assignment.fee_structure?.name}
          onClose={() => {
            setEditing(false)
            setEditError(null)
          }}
          onSubmit={(items) => editMutation.mutate(items)}
          isSaving={editMutation.isPending}
          error={editError}
        />
      )}
    </Modal>
  )
}

function SummaryCard({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="text-[0.7rem] uppercase tracking-wider text-ink/45">{label}</p>
      <p className={`mt-0.5 text-[1rem] font-bold ${danger ? 'text-[#dc2626]' : accent ? 'text-accent' : 'text-ink'}`}>{value}</p>
    </div>
  )
}

function PaymentHistory({
  plan,
  canEdit,
  onVoid,
}: {
  plan: NonNullable<Awaited<ReturnType<typeof fetchStudentPlan>>>
  canEdit: boolean
  onVoid: (id: number) => void
}) {
  const payments = plan.invoices
    .flatMap((invoice) => (invoice.payments ?? []).map((p) => ({ ...p, period: invoice.period_label })))
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))

  if (payments.length === 0) return null

  return (
    <section>
      <h3 className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wider text-ink/45">Payment History</h3>
      <div className="space-y-1.5">
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2 text-[0.82rem]">
            <div>
              <span className="font-medium text-ink">{payment.receipt_no}</span>
              <span className="ml-2 text-ink/45">{payment.paid_on}</span>
              <span className="ml-2 text-ink/45">· {(payment.mode as PaymentMode) ?? ''}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-ink">{formatINR(payment.amount)}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Void receipt ${payment.receipt_no}?`)) onVoid(payment.id)
                  }}
                  className="text-[0.74rem] font-semibold text-[#dc2626] hover:underline"
                >
                  Void
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function AssignPlanPanel({
  studentId,
  classId,
  canEdit,
  onAssigned,
}: {
  studentId: number
  classId: number | null
  canEdit: boolean
  onAssigned: () => void
}) {
  const queryClient = useQueryClient()
  const [structureId, setStructureId] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('none')
  const [discountValue, setDiscountValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: structures } = useQuery({
    queryKey: ['fee-structures', { class_id: classId }],
    queryFn: () => fetchFeeStructures(classId ? { class_id: classId } : undefined),
  })

  const assignMutation = useMutation({
    mutationFn: () =>
      assignStudentFee(studentId, {
        fee_structure_id: Number(structureId),
        discount_type: discountType,
        discount_value: discountType === 'none' ? undefined : Number(discountValue || 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-plan', studentId] })
      onAssigned()
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  if (!canEdit) {
    return <p className="rounded-xl border border-line bg-paper/40 px-4 py-6 text-center text-[0.85rem] text-ink/55">No fee plan assigned yet.</p>
  }

  const options = structures ?? []

  return (
    <section className="rounded-2xl border border-line bg-paper/35 p-4">
      <h3 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-wider text-ink/45">Assign a Fee Plan</h3>
      {error && <p className="mb-3 text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}
      {options.length === 0 ? (
        <p className="text-[0.85rem] text-ink/55">
          No fee structure is available for this class. Create one in the <strong>Fee Structures</strong> tab first.
        </p>
      ) : (
        <div className="space-y-3">
          <select value={structureId} onChange={(e) => setStructureId(e.target.value)} className={inputClass}>
            <option value="">Select a fee structure</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.class?.name ? ` · ${s.class.name}` : ''}
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className={inputClass}>
              <option value="none">No discount</option>
              <option value="percent">Percent discount</option>
              <option value="fixed">Fixed discount (per occurrence)</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={discountType === 'none'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percent' ? 'e.g. 10 (%)' : 'Amount'}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            disabled={!structureId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2 disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign & Generate Invoices'}
          </button>
        </div>
      )}
    </section>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import { formatINR } from '../format'
import { PAYMENT_MODE_LABELS, type FeeInvoice, type PaymentMode } from '../types'

const MODES = Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]

interface FormValues {
  amount: string
  mode: PaymentMode
  reference_no: string
  paid_on: string
  remarks: string
}

export default function CollectPaymentModal({
  invoice,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  invoice: FeeInvoice
  onClose: () => void
  onSubmit: (values: { amount: number; mode: PaymentMode; reference_no?: string; paid_on?: string; remarks?: string }) => void
  isSaving: boolean
  error: string | null
}) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      amount: String(invoice.balance),
      mode: 'cash',
      reference_no: '',
      paid_on: today,
      remarks: '',
    },
  })

  return (
    <Modal title="Collect Payment" description={`${invoice.invoice_no} · ${invoice.period_label}`} onClose={onClose}>
      <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl border border-line bg-paper/40 p-3 text-center text-[0.8rem]">
        <div>
          <p className="text-ink/45">Total</p>
          <p className="font-semibold text-ink">{formatINR(invoice.total_amount)}</p>
        </div>
        <div>
          <p className="text-ink/45">Paid</p>
          <p className="font-semibold text-ink">{formatINR(invoice.paid_amount)}</p>
        </div>
        <div>
          <p className="text-ink/45">Balance</p>
          <p className="font-semibold text-accent">{formatINR(invoice.balance)}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((values) =>
          onSubmit({
            amount: Number(values.amount),
            mode: values.mode,
            reference_no: values.reference_no || undefined,
            paid_on: values.paid_on || undefined,
            remarks: values.remarks || undefined,
          }),
        )}
        className="space-y-4"
      >
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Amount" htmlFor="amount" error={errors.amount}>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.balance}
              className={inputClass}
              {...register('amount', {
                required: 'Amount is required',
                validate: (v) =>
                  Number(v) > 0 && Number(v) <= invoice.balance + 0.001 ? true : 'Amount must be between 0 and the balance',
              })}
            />
          </FormField>
          <FormField label="Mode" htmlFor="mode">
            <select id="mode" className={inputClass} {...register('mode')}>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Reference No." htmlFor="reference_no" hint="Cheque / txn id (optional)">
            <input id="reference_no" className={inputClass} {...register('reference_no')} />
          </FormField>
          <FormField label="Payment Date" htmlFor="paid_on">
            <input id="paid_on" type="date" className={inputClass} {...register('paid_on')} />
          </FormField>
        </div>

        <FormField label="Remarks" htmlFor="remarks">
          <input id="remarks" className={inputClass} {...register('remarks')} />
        </FormField>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-2 disabled:opacity-60"
          >
            {isSaving ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

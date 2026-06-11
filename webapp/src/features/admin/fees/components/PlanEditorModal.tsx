import { useFieldArray, useForm } from 'react-hook-form'
import { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import { formatINR } from '../format'
import {
  FREQUENCY_LABELS,
  type DiscountType,
  type FeeHead,
  type Frequency,
  type StudentFeeItem,
  type StudentFeeItemPayload,
} from '../types'

const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as Frequency[]

interface RowForm {
  fee_head_id: string
  label: string
  base_amount: string
  frequency: Frequency
  discount_type: DiscountType
  discount_value: string
  billed: boolean
}

function toRow(item: StudentFeeItem): RowForm {
  return {
    fee_head_id: item.fee_head_id ? String(item.fee_head_id) : '',
    label: item.label,
    base_amount: String(item.base_amount),
    frequency: item.frequency,
    discount_type: item.discount_type,
    discount_value: String(item.discount_value ?? 0),
    billed: !item.is_optional,
  }
}

function blankRow(): RowForm {
  return { fee_head_id: '', label: '', base_amount: '', frequency: 'monthly', discount_type: 'none', discount_value: '', billed: true }
}

export default function PlanEditorModal({
  items,
  feeHeads,
  structureName,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  items: StudentFeeItem[]
  feeHeads: FeeHead[]
  structureName?: string | null
  onClose: () => void
  onSubmit: (items: StudentFeeItemPayload[]) => void
  isSaving: boolean
  error: string | null
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
  } = useForm<{ items: RowForm[] }>({
    defaultValues: { items: items.length > 0 ? items.map(toRow) : [blankRow()] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watched = watch('items')

  const liveTotalPerCycle = (watched ?? []).reduce((sum, row) => {
    if (!row?.billed) return sum
    const base = Number(row.base_amount || 0)
    const value = Number(row.discount_value || 0)
    const net =
      row.discount_type === 'percent'
        ? base - (base * Math.min(Math.max(value, 0), 100)) / 100
        : row.discount_type === 'fixed'
          ? base - value
          : base
    return sum + Math.max(net, 0)
  }, 0)

  return (
    <Modal
      title="Edit Fee Plan"
      description={structureName ? `Customise this student's fees · base: ${structureName}` : "Customise this student's fees"}
      onClose={onClose}
      size="lg"
    >
      <form
        onSubmit={handleSubmit((values) =>
          onSubmit(
            values.items
              .filter((row) => row.label.trim() !== '' || row.fee_head_id !== '')
              .map((row) => {
                const head = feeHeads.find((h) => String(h.id) === row.fee_head_id)
                return {
                  fee_head_id: row.fee_head_id ? Number(row.fee_head_id) : null,
                  label: row.label.trim() || head?.name || 'Fee',
                  base_amount: Number(row.base_amount || 0),
                  frequency: row.frequency,
                  discount_type: row.discount_type,
                  discount_value: row.discount_type === 'none' ? 0 : Number(row.discount_value || 0),
                  is_custom: !row.fee_head_id,
                  is_optional: !row.billed,
                }
              }),
          ),
        )}
        className="space-y-4"
      >
        {error && <p className="text-[0.82rem] font-medium text-[#dc2626]">{error}</p>}

        <p className="text-[0.82rem] text-ink/55">
          Add any fee — pick a fee head or a custom one-off charge, set the amount, frequency, and an optional discount.
          Untick <strong>Bill</strong> to keep a line on the plan without charging it. Already-paid invoices are preserved;
          changes apply to unpaid and upcoming instalments.
        </p>

        <div className="space-y-2">
          {/* Header row (desktop) */}
          <div className="hidden gap-2 px-1 text-[0.68rem] font-semibold uppercase tracking-wider text-ink/40 sm:grid sm:grid-cols-[1.4fr_1.4fr_0.9fr_1fr_0.9fr_0.9fr_auto]">
            <span>Fee Head</span>
            <span>Label</span>
            <span>Amount</span>
            <span>Frequency</span>
            <span>Discount</span>
            <span>Value</span>
            <span className="text-center">Bill</span>
          </div>

          {fields.map((field, index) => {
            const reg = register(`items.${index}.fee_head_id`)
            const discountType = watched?.[index]?.discount_type
            return (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-paper/30 p-2 sm:grid-cols-[1.4fr_1.4fr_0.9fr_1fr_0.9fr_0.9fr_auto] sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
              >
                <select
                  {...reg}
                  onChange={(event) => {
                    reg.onChange(event)
                    const head = feeHeads.find((h) => String(h.id) === event.target.value)
                    setValue(`items.${index}.label`, head ? head.name : '')
                  }}
                  className={inputClass}
                  aria-label="Fee head"
                >
                  <option value="">Custom fee…</option>
                  {feeHeads.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                      {h.is_optional ? ' (optional)' : ''}
                    </option>
                  ))}
                </select>
                <input className={inputClass} placeholder="Label" {...register(`items.${index}.label`)} />
                <input type="number" step="0.01" min="0" placeholder="0" className={inputClass} {...register(`items.${index}.base_amount`)} />
                <select className={inputClass} {...register(`items.${index}.frequency`)} aria-label="Frequency">
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </option>
                  ))}
                </select>
                <select className={inputClass} {...register(`items.${index}.discount_type`)} aria-label="Discount type">
                  <option value="none">None</option>
                  <option value="percent">%</option>
                  <option value="fixed">Fixed</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  disabled={discountType === 'none' || discountType === undefined}
                  className={inputClass}
                  {...register(`items.${index}.discount_value`)}
                />
                <div className="flex items-center justify-between gap-2 sm:justify-center">
                  <label className="flex items-center gap-1.5 text-[0.74rem] text-ink/60 sm:gap-0">
                    <input type="checkbox" className="h-4 w-4 rounded border-line text-accent" {...register(`items.${index}.billed`)} />
                    <span className="sm:hidden">Bill this fee</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    className="text-[0.74rem] font-semibold text-[#dc2626] hover:underline disabled:opacity-40"
                    aria-label="Remove line"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => append(blankRow())}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
          >
            + Add fee line
          </button>
          <p className="text-[0.82rem] text-ink/55">
            Billed per cycle: <span className="font-semibold text-ink">{formatINR(liveTotalPerCycle)}</span>
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-line pt-4">
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
            {isSaving ? 'Saving…' : 'Save Plan & Regenerate'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

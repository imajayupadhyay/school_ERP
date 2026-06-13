import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import type { SchoolClass } from '../../academic-setup/types'
import FormField, { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { AddButton, RowAction, TableErrorState, TableSkeleton } from '../../components/TableUI'
import { EditIcon, LayersIcon, TrashIcon } from '../../components/icons'
import {
  copyDefaultToClass,
  createPeriodSlot,
  deleteClassSchedule,
  deletePeriodSlot,
  fetchPeriodSlots,
  updatePeriodSlot,
} from '../api'
import type { PeriodSlot, PeriodSlotPayload } from '../types'

const emptyForm: PeriodSlotPayload = {
  name: '',
  sequence: 1,
  start_time: '',
  end_time: '',
  is_break: false,
  status: 'active',
}

type Scope = 'default' | number

interface Props {
  canManage: boolean
  classes: SchoolClass[]
}

export default function PeriodScheduleTab({ canManage, classes }: Props) {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<Scope>('default')

  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: ['period-slots', scope],
    queryFn: () => fetchPeriodSlots(scope === 'default' ? undefined : { class_id: scope }),
  })
  const slots = result?.slots ?? []
  const inherited = result?.inherited ?? false
  const isClassScope = scope !== 'default'
  // Inherited rows belong to the default set, so they can't be edited in place —
  // the class must get its own copy first.
  const canEditScope = canManage && !inherited
  const scopeClass = isClassScope ? classes.find((c) => c.id === scope) : undefined

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PeriodSlot | null>(null)
  const [form, setForm] = useState<PeriodSlotPayload>(emptyForm)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['period-slots'] })

  const saveMutation = useMutation({
    mutationFn: (payload: PeriodSlotPayload) =>
      editing ? updatePeriodSlot(editing.id, payload) : createPeriodSlot(payload),
    onSuccess: () => {
      invalidate()
      setModalOpen(false)
    },
    onError: (error) => window.alert(extractErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePeriodSlot,
    onSuccess: invalidate,
    onError: (error) => window.alert(extractErrorMessage(error)),
  })

  const copyMutation = useMutation({
    mutationFn: (classId: number) => copyDefaultToClass(classId),
    onSuccess: invalidate,
    onError: (error) => window.alert(extractErrorMessage(error)),
  })

  const revertMutation = useMutation({
    mutationFn: (classId: number) => deleteClassSchedule(classId),
    onSuccess: invalidate,
    onError: (error) => window.alert(extractErrorMessage(error)),
  })

  const openCreate = () => {
    const nextSeq = slots.length ? Math.max(...slots.map((s) => s.sequence)) + 1 : 1
    setEditing(null)
    setForm({ ...emptyForm, sequence: nextSeq })
    setModalOpen(true)
  }

  const openEdit = (slot: PeriodSlot) => {
    setEditing(slot)
    setForm({
      name: slot.name,
      sequence: slot.sequence,
      start_time: slot.start_time ?? '',
      end_time: slot.end_time ?? '',
      is_break: slot.is_break,
      status: slot.status,
    })
    setModalOpen(true)
  }

  const submit = () => {
    saveMutation.mutate({
      ...form,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      class_id: scope === 'default' ? null : scope,
    })
  }

  return (
    <div className="space-y-4">
      {/* Scope picker + scope-level actions */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.74rem] font-semibold uppercase tracking-[0.06em] text-ink/45">Schedule for</span>
          <select
            className={`${inputClass} min-w-[220px]`}
            value={scope}
            onChange={(e) => setScope(e.target.value === 'default' ? 'default' : Number(e.target.value))}
          >
            <option value="default">School default</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-2">
          {isClassScope && !inherited && canManage && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remove ${scopeClass?.name ?? 'this class'}'s custom schedule and revert to the school default?`)) {
                  revertMutation.mutate(scope as number)
                }
              }}
              disabled={revertMutation.isPending}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-[#dc2626] transition hover:border-[#dc2626]/40 hover:bg-[#dc2626]/5 disabled:opacity-50"
            >
              Revert to default
            </button>
          )}
          {canEditScope && <AddButton label="Add Period" onClick={openCreate} />}
        </div>
      </div>

      <p className="text-[0.85rem] text-ink/55">
        {scope === 'default'
          ? <>The school default bell schedule, inherited by every class without its own. Mark recess/lunch rows as a <b className="text-ink/70">break</b> — they hold no class.</>
          : inherited
            ? <><b className="text-ink/70">{scopeClass?.name}</b> currently inherits the school default schedule.</>
            : <><b className="text-ink/70">{scopeClass?.name}</b> has its own schedule. Editing it does not affect any other class.</>}
      </p>

      {isClassScope && inherited && canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] px-4 py-3.5">
          <p className="text-[0.85rem] text-ink/70">
            Give <b>{scopeClass?.name}</b> its own period and lunch times by copying the school default as a starting point.
          </p>
          <button
            type="button"
            onClick={() => copyMutation.mutate(scope as number)}
            disabled={copyMutation.isPending}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5 disabled:opacity-50"
          >
            {copyMutation.isPending ? 'Creating…' : 'Create custom schedule'}
          </button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : isError ? (
        <TableErrorState onRetry={() => refetch()} />
      ) : slots.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <LayersIcon width={30} height={30} />
          </span>
          <h3 className="mt-4 text-[1.05rem] font-bold text-ink">No periods yet</h3>
          <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
            Define your daily periods and breaks before building class timetables.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                <th className="px-5 py-3.5 font-bold">#</th>
                <th className="px-5 py-3.5 font-bold">Period</th>
                <th className="px-5 py-3.5 font-bold">Time</th>
                <th className="px-5 py-3.5 font-bold">Type</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                {canEditScope && <th className="px-5 py-3.5 text-right font-bold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr
                  key={slot.id}
                  className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]"
                >
                  <td className="px-5 py-3 font-bold tabular-nums text-ink/55">{slot.sequence}</td>
                  <td className="px-5 py-3 font-semibold text-ink">{slot.name}</td>
                  <td className="px-5 py-3 tabular-nums text-ink/65">
                    {slot.start_time && slot.end_time ? `${slot.start_time} – ${slot.end_time}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${
                        slot.is_break ? 'bg-lime/15 text-[#b45309]' : 'bg-[#2c49a6]/10 text-[#2c49a6]'
                      }`}
                    >
                      {slot.is_break ? 'Break' : 'Class'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={slot.status} />
                  </td>
                  {canEditScope && (
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                        <RowAction label="Edit" onClick={() => openEdit(slot)}>
                          <EditIcon width={17} height={17} />
                        </RowAction>
                        <RowAction
                          label="Delete"
                          danger
                          onClick={() => {
                            if (window.confirm(`Delete "${slot.name}"? This cannot be undone.`)) {
                              deleteMutation.mutate(slot.id)
                            }
                          }}
                        >
                          <TrashIcon width={17} height={17} />
                        </RowAction>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Edit period' : 'Add period'}
          description={scope === 'default'
            ? 'Part of the school default schedule, inherited by classes without their own.'
            : `Part of ${scopeClass?.name ?? 'this class'}'s custom schedule only.`}
          onClose={() => setModalOpen(false)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="slot-name">
              <input
                id="slot-name"
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Period 1 / Lunch"
              />
            </FormField>
            <FormField label="Order" htmlFor="slot-seq">
              <input
                id="slot-seq"
                type="number"
                min={1}
                className={inputClass}
                value={form.sequence}
                onChange={(e) => setForm({ ...form, sequence: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Start time" htmlFor="slot-start">
              <input
                id="slot-start"
                type="time"
                className={inputClass}
                value={form.start_time ?? ''}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </FormField>
            <FormField label="End time" htmlFor="slot-end">
              <input
                id="slot-end"
                type="time"
                className={inputClass}
                value={form.end_time ?? ''}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </FormField>
            <FormField label="Status" htmlFor="slot-status">
              <select
                id="slot-status"
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>
            <label className="flex items-center gap-2.5 self-end pb-2.5 text-[0.85rem] font-semibold text-ink/70">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30"
                checked={form.is_break ?? false}
                onChange={(e) => setForm({ ...form, is_break: e.target.checked })}
              />
              This is a break (recess / lunch)
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saveMutation.isPending || !form.name.trim()}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add period'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

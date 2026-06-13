import { useMemo, useState } from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import type { AcademicSession, ClassSubjectRef, SchoolClass } from '../../academic-setup/types'
import type { Employee } from '../../employees/types'
import { inputClass } from '../../components/FormField'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { CalendarIcon } from '../../components/icons'
import {
  createTimetable,
  deleteTimetable,
  fetchPeriodSlots,
  fetchTimetable,
  fetchTimetables,
  publishTimetable,
  saveTimetableEntries,
  unpublishTimetable,
} from '../api'
import type { PeriodSlot, Timetable, TimetableEntryPayload } from '../types'

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

type CellDraft = { subject_id: number; employee_id: number }
type Draft = Record<string, CellDraft>

const cellKey = (day: number, slotId: number) => `${day}-${slotId}`

interface Props {
  academicSessions: AcademicSession[]
  classes: SchoolClass[]
  teachers: Employee[]
  canManage: boolean
  isSetupLoading: boolean
}

export default function ClassTimetableTab({ academicSessions, classes, teachers, canManage }: Props) {
  const queryClient = useQueryClient()
  const currentSession = academicSessions.find((s) => s.is_current) ?? academicSessions[0]

  const [selectedSession, setSelectedSession] = useState<number | ''>('')
  const [selectedClass, setSelectedClass] = useState<number | ''>('')
  const [selectedSection, setSelectedSection] = useState<number | ''>('')

  // Derive defaults/validity during render (no setState-in-effect).
  const sessionId: number | '' = selectedSession !== '' ? selectedSession : currentSession?.id ?? ''
  const classId = selectedClass
  const classObj = classes.find((c) => c.id === classId)
  const sections = classObj?.sections ?? []
  const classSubjects = classObj?.subjects ?? []
  const sectionId: number | '' =
    selectedSection !== '' && sections.some((s) => s.id === selectedSection) ? selectedSection : ''

  const scopeReady = Boolean(sessionId) && Boolean(classId) && Boolean(sectionId)
  const scopeParams = scopeReady
    ? { academic_session_id: Number(sessionId), class_id: Number(classId), section_id: Number(sectionId) }
    : undefined

  // Each class renders its own effective schedule (custom override, else the
  // school default), so the grid rows can differ from class to class.
  const { data: slotsResult } = useQuery({
    queryKey: ['period-slots', classId || 'none'],
    queryFn: () => fetchPeriodSlots(classId ? { class_id: Number(classId) } : undefined),
    enabled: classId !== '',
  })
  const teachingSlots = useMemo(
    () => (slotsResult?.slots ?? []).filter((s) => s.status === 'active'),
    [slotsResult],
  )

  const listQuery = useQuery({
    queryKey: ['timetables', scopeParams],
    queryFn: () => fetchTimetables(scopeParams),
    enabled: scopeReady,
  })
  const existing = listQuery.data?.[0]

  const detailQuery = useQuery({
    queryKey: ['timetable', existing?.id],
    queryFn: () => fetchTimetable(existing!.id),
    enabled: !!existing,
  })

  const invalidate = (id?: number) => {
    queryClient.invalidateQueries({ queryKey: ['timetables', scopeParams] })
    if (id) queryClient.invalidateQueries({ queryKey: ['timetable', id] })
  }

  const createMutation = useMutation({
    mutationFn: () => createTimetable(scopeParams!),
    onSuccess: () => invalidate(),
    onError: (e) => window.alert(extractErrorMessage(e)),
  })

  return (
    <div className="space-y-5">
      {/* Scope picker */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.78rem] font-semibold text-ink/60">Academic session</span>
            <select className={inputClass} value={sessionId} onChange={(e) => setSelectedSession(Number(e.target.value) || '')}>
              <option value="">Select session</option>
              {academicSessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.78rem] font-semibold text-ink/60">Class</span>
            <select
              className={inputClass}
              value={classId}
              onChange={(e) => { setSelectedClass(Number(e.target.value) || ''); setSelectedSection('') }}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.78rem] font-semibold text-ink/60">Section</span>
            <select className={inputClass} value={sectionId} disabled={classId === ''} onChange={(e) => setSelectedSection(Number(e.target.value) || '')}>
              <option value="">Select section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!scopeReady ? (
        <EmptyHint text="Choose a session, class, and section to view or build its timetable." />
      ) : listQuery.isLoading ? (
        <EmptyHint text="Loading…" />
      ) : !existing ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <CalendarIcon width={30} height={30} />
          </span>
          <h3 className="mt-4 text-[1.05rem] font-bold text-ink">No timetable yet</h3>
          <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
            {canManage
              ? 'Create a blank timetable for this class and section, then fill in the weekly grid.'
              : 'A timetable has not been published for this class and section yet.'}
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create timetable'}
            </button>
          )}
        </div>
      ) : detailQuery.isLoading || !detailQuery.data ? (
        <EmptyHint text="Loading timetable…" />
      ) : (
        // key remounts the editor (and re-seeds its draft) when the timetable changes.
        <TimetableEditor
          key={detailQuery.data.id}
          timetable={detailQuery.data}
          slots={teachingSlots}
          classSubjects={classSubjects}
          teachers={teachers}
          canManage={canManage}
          onChanged={invalidate}
        />
      )}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-14 text-center text-[0.88rem] text-ink/50 shadow-sm">
      {text}
    </div>
  )
}

interface EditorProps {
  timetable: Timetable
  slots: PeriodSlot[]
  classSubjects: ClassSubjectRef[]
  teachers: Employee[]
  canManage: boolean
  onChanged: (id?: number) => void
}

function buildDraft(timetable: Timetable): Draft {
  const next: Draft = {}
  for (const entry of timetable.entries ?? []) {
    next[cellKey(entry.day_of_week, entry.period_slot_id)] = {
      subject_id: entry.subject_id,
      employee_id: entry.employee_id,
    }
  }
  return next
}

function TimetableEditor({ timetable, slots, classSubjects, teachers, canManage, onChanged }: EditorProps) {
  const [draft, setDraft] = useState<Draft>(() => buildDraft(timetable))
  const [dirty, setDirty] = useState(false)
  const [editorCell, setEditorCell] = useState<{ day: number; slotId: number } | null>(null)
  const [conflicts, setConflicts] = useState<string[]>([])

  const isPublished = timetable.status === 'published'
  const teacherName = (id: number) => teachers.find((t) => t.id === id)?.full_name ?? 'Teacher'
  const subjectName = (id: number) => classSubjects.find((s) => s.id === id)?.name ?? 'Subject'

  const setCell = (day: number, slotId: number, value: CellDraft | null) => {
    setDraft((prev) => {
      const next = { ...prev }
      if (value) next[cellKey(day, slotId)] = value
      else delete next[cellKey(day, slotId)]
      return next
    })
    setDirty(true)
  }

  const saveMutation = useMutation({
    mutationFn: (entries: TimetableEntryPayload[]) => saveTimetableEntries(timetable.id, entries),
    onSuccess: (saved) => { setConflicts([]); setDirty(false); onChanged(saved.id) },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const list = (error.response.data as { errors?: { entries?: string[] } }).errors?.entries
        if (list && list.length) { setConflicts(list); return }
      }
      window.alert(extractErrorMessage(error))
    },
  })

  const publishMutation = useMutation({
    mutationFn: (publish: boolean) => (publish ? publishTimetable(timetable.id) : unpublishTimetable(timetable.id)),
    onSuccess: (saved) => onChanged(saved.id),
    onError: (e) => window.alert(extractErrorMessage(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTimetable(timetable.id),
    onSuccess: () => onChanged(),
    onError: (e) => window.alert(extractErrorMessage(e)),
  })

  const handleSave = () => {
    const entries: TimetableEntryPayload[] = Object.entries(draft).map(([key, cell]) => {
      const [day, slotId] = key.split('-').map(Number)
      return { day_of_week: day, period_slot_id: slotId, subject_id: cell.subject_id, employee_id: cell.employee_id }
    })
    saveMutation.mutate(entries)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[0.9rem] font-bold text-ink">
            {timetable.school_class?.name} · {timetable.section?.name}
          </span>
          <StatusBadge status={timetable.status} />
        </div>
        {canManage && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saveMutation.isPending}
              className="rounded-xl bg-accent px-4 py-2 text-[0.85rem] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {saveMutation.isPending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </button>
            <button
              type="button"
              onClick={() => publishMutation.mutate(!isPublished)}
              disabled={publishMutation.isPending || dirty}
              title={dirty ? 'Save changes before publishing' : undefined}
              className="rounded-xl border border-line bg-white px-4 py-2 text-[0.85rem] font-semibold text-ink/65 transition hover:border-accent hover:text-accent disabled:opacity-40"
            >
              {isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete this timetable and all its periods? This cannot be undone.')) deleteMutation.mutate()
              }}
              className="rounded-xl border border-line bg-white px-4 py-2 text-[0.85rem] font-semibold text-[#dc2626] transition hover:border-[#dc2626]/40 hover:bg-[#dc2626]/5"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-2xl border border-[#dc2626]/30 bg-[#dc2626]/5 px-4 py-3">
          <p className="text-[0.82rem] font-bold text-[#dc2626]">Teacher clashes — resolve and save again:</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[0.82rem] text-[#dc2626]/90">
            {conflicts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full min-w-[760px] border-collapse text-left text-[0.82rem]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
              <th className="w-40 px-4 py-3 font-bold">Period</th>
              {DAYS.map((d) => (
                <th key={d.value} className="px-3 py-3 text-center font-bold">{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-2.5 align-top">
                  <div className="font-semibold text-ink">{slot.name}</div>
                  {slot.start_time && slot.end_time && (
                    <div className="mt-0.5 text-[0.72rem] tabular-nums text-ink/45">{slot.start_time}–{slot.end_time}</div>
                  )}
                </td>
                {slot.is_break ? (
                  <td colSpan={DAYS.length} className="bg-lime/[0.06] px-4 py-2.5 text-center text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#b45309]">
                    {slot.name}
                  </td>
                ) : (
                  DAYS.map((day) => {
                    const cell = draft[cellKey(day.value, slot.id)]
                    return (
                      <td key={day.value} className="px-1.5 py-1.5 align-top">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => canManage && setEditorCell({ day: day.value, slotId: slot.id })}
                          className={`flex h-full min-h-[58px] w-full flex-col items-start justify-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-left transition ${
                            cell
                              ? 'border-accent/25 bg-accent/[0.06] hover:border-accent/50'
                              : 'border-dashed border-line text-ink/35 hover:border-accent/40 hover:text-accent'
                          } ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {cell ? (
                            <>
                              <span className="line-clamp-1 text-[0.8rem] font-bold text-ink">{subjectName(cell.subject_id)}</span>
                              <span className="line-clamp-1 text-[0.72rem] text-ink/55">{teacherName(cell.employee_id)}</span>
                            </>
                          ) : (
                            <span className="text-[0.78rem] font-semibold">{canManage ? '+ Add' : '—'}</span>
                          )}
                        </button>
                      </td>
                    )
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {slots.filter((s) => !s.is_break).length === 0 && (
        <p className="text-center text-[0.84rem] text-ink/50">
          No teaching periods defined yet. Add periods in the <b className="text-ink/70">Period Schedule</b> tab first.
        </p>
      )}

      {editorCell && (
        <CellEditor
          subjects={classSubjects}
          teachers={teachers}
          value={draft[cellKey(editorCell.day, editorCell.slotId)] ?? null}
          dayLabel={DAYS.find((d) => d.value === editorCell.day)?.label ?? ''}
          slotName={slots.find((s) => s.id === editorCell.slotId)?.name ?? ''}
          onClear={() => { setCell(editorCell.day, editorCell.slotId, null); setEditorCell(null) }}
          onSave={(cell) => { setCell(editorCell.day, editorCell.slotId, cell); setEditorCell(null) }}
          onClose={() => setEditorCell(null)}
        />
      )}
    </div>
  )
}

interface CellEditorProps {
  subjects: ClassSubjectRef[]
  teachers: Employee[]
  value: CellDraft | null
  dayLabel: string
  slotName: string
  onSave: (cell: CellDraft) => void
  onClear: () => void
  onClose: () => void
}

function CellEditor({ subjects, teachers, value, dayLabel, slotName, onSave, onClear, onClose }: CellEditorProps) {
  const [subjectId, setSubjectId] = useState<number | ''>(value?.subject_id ?? '')
  const [employeeId, setEmployeeId] = useState<number | ''>(value?.employee_id ?? '')

  return (
    <Modal title={`${dayLabel} · ${slotName}`} description="Assign a subject and teacher to this period." onClose={onClose}>
      <div className="grid gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold text-ink/70">Subject</span>
          <select className={inputClass} value={subjectId} onChange={(e) => setSubjectId(Number(e.target.value) || '')}>
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {subjects.length === 0 && (
            <span className="text-[0.74rem] text-ink/40">No subjects mapped to this class. Map subjects in Academic Setup first.</span>
          )}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold text-ink/70">Teacher</span>
          <select className={inputClass} value={employeeId} onChange={(e) => setEmployeeId(Number(e.target.value) || '')}>
            <option value="">Select teacher</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onClear}
          disabled={!value}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-[#dc2626] transition hover:border-[#dc2626]/40 hover:bg-[#dc2626]/5 disabled:opacity-40"
        >
          Clear
        </button>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 transition hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => subjectId !== '' && employeeId !== '' && onSave({ subject_id: Number(subjectId), employee_id: Number(employeeId) })}
            disabled={subjectId === '' || employeeId === ''}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5 disabled:opacity-50"
          >
            Set period
          </button>
        </div>
      </div>
    </Modal>
  )
}

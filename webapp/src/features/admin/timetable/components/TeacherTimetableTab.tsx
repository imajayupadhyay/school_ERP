import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AcademicSession } from '../../academic-setup/types'
import type { Employee } from '../../employees/types'
import { inputClass } from '../../components/FormField'
import { TeachersIcon } from '../../components/icons'
import { fetchPeriodSlots, fetchTeacherTimetable } from '../api'

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

interface Props {
  teachers: Employee[]
  academicSessions: AcademicSession[]
  isSetupLoading: boolean
}

export default function TeacherTimetableTab({ teachers, academicSessions }: Props) {
  const currentSession = academicSessions.find((s) => s.is_current) ?? academicSessions[0]
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('')
  // Derive the active teacher so we default to the first one without an effect.
  const defaultEmployee: number | '' = teachers.length ? teachers[0].id : ''
  const employeeId: number | '' = selectedEmployee !== '' ? selectedEmployee : defaultEmployee
  const setEmployeeId = setSelectedEmployee

  const { data: slots = [] } = useQuery({ queryKey: ['period-slots'], queryFn: fetchPeriodSlots })

  const params = currentSession ? { academic_session_id: currentSession.id } : undefined
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-timetable', employeeId, params],
    queryFn: () => fetchTeacherTimetable(Number(employeeId), params),
    enabled: employeeId !== '',
  })

  const byCell = new Map<string, NonNullable<typeof data>['entries'][number]>()
  for (const entry of data?.entries ?? []) {
    byCell.set(`${entry.day_of_week}-${entry.period_slot_id}`, entry)
  }
  const teachingSlots = slots.filter((s) => !s.is_break && s.status === 'active')

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1.5 sm:max-w-xs">
          <span className="text-[0.78rem] font-semibold text-ink/60">Teacher</span>
          <select className={inputClass} value={employeeId} onChange={(e) => setEmployeeId(Number(e.target.value) || '')}>
            <option value="">Select teacher</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </label>
      </div>

      {employeeId === '' ? (
        <Hint text="Select a teacher to view their weekly schedule." />
      ) : isLoading ? (
        <Hint text="Loading…" />
      ) : (data?.entries ?? []).length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <TeachersIcon width={30} height={30} />
          </span>
          <h3 className="mt-4 text-[1.05rem] font-bold text-ink">No periods scheduled</h3>
          <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">
            This teacher has no published timetable periods for the current session yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-[0.82rem]">
            <thead>
              <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
                <th className="w-40 px-4 py-3 font-bold">Period</th>
                {DAYS.map((d) => (
                  <th key={d.value} className="px-3 py-3 text-center font-bold">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachingSlots.map((slot) => (
                <tr key={slot.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5 align-top">
                    <div className="font-semibold text-ink">{slot.name}</div>
                    {slot.start_time && slot.end_time && (
                      <div className="mt-0.5 text-[0.72rem] tabular-nums text-ink/45">{slot.start_time}–{slot.end_time}</div>
                    )}
                  </td>
                  {DAYS.map((day) => {
                    const entry = byCell.get(`${day.value}-${slot.id}`)
                    return (
                      <td key={day.value} className="px-1.5 py-1.5 align-top">
                        {entry ? (
                          <div className="flex min-h-[58px] flex-col justify-center gap-0.5 rounded-lg border border-accent/25 bg-accent/[0.06] px-2.5 py-1.5">
                            <span className="line-clamp-1 text-[0.8rem] font-bold text-ink">{entry.subject?.name ?? 'Subject'}</span>
                            <span className="line-clamp-1 text-[0.72rem] text-ink/55">
                              {entry.class_name}{entry.section_name ? ` · ${entry.section_name}` : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="grid min-h-[58px] place-items-center rounded-lg border border-dashed border-line text-[0.78rem] text-ink/30">—</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Hint({ text }: { text: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-14 text-center text-[0.88rem] text-ink/50 shadow-sm">
      {text}
    </div>
  )
}

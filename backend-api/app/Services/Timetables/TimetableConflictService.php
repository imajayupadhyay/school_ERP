<?php

namespace App\Services\Timetables;

use App\Models\Employee;
use App\Models\PeriodSlot;
use App\Models\Timetable;
use App\Models\TimetableEntry;

/**
 * The "block + warn" core of the timetable module.
 *
 * Given the entries an admin wants to save onto a timetable, it finds any
 * teacher who would be double-booked — either twice inside the same submission,
 * or against an already-saved entry in another class-section timetable for the
 * same academic session. The controller turns the returned clashes into a 422
 * so a teacher can never be in two rooms at once.
 *
 * Because classes can now have DIFFERENT period schedules (their own start/end
 * times), a clash is detected by actual TIME OVERLAP on the same day, not by a
 * shared period_slot_id. When a slot has no times recorded (NULL), we fall back
 * to the legacy rule — same slot id = clash — which keeps time-less schedules
 * and older data working.
 */
class TimetableConflictService
{
    /**
     * @param  array<int, array{day_of_week:int, period_slot_id:int, subject_id:int, employee_id:int}>  $entries
     * @return array<int, array<string, mixed>>  Human-readable clash descriptions.
     */
    public function detect(Timetable $timetable, array $entries): array
    {
        if ($entries === []) {
            return [];
        }

        // Resolve each payload entry's clock window from its period slot.
        $slotTimes = $this->slotTimes(collect($entries)->pluck('period_slot_id')->unique()->all());
        $payload = array_map(function (array $entry) use ($slotTimes) {
            $window = $slotTimes[$entry['period_slot_id']] ?? ['start' => null, 'end' => null];

            return [
                'employee_id' => (int) $entry['employee_id'],
                'day_of_week' => (int) $entry['day_of_week'],
                'period_slot_id' => (int) $entry['period_slot_id'],
                'start' => $window['start'],
                'end' => $window['end'],
            ];
        }, $entries);

        return array_merge(
            $this->withinPayload($payload),
            $this->againstOtherTimetables($timetable, $payload),
        );
    }

    /**
     * Same teacher placed in two overlapping periods within one submission.
     *
     * @param  array<int, array<string, int|null>>  $payload
     * @return array<int, array<string, mixed>>
     */
    private function withinPayload(array $payload): array
    {
        $clashes = [];

        // Compare every pair sharing a teacher + day; report overlaps.
        foreach ($payload as $i => $a) {
            foreach ($payload as $j => $b) {
                if ($j <= $i) {
                    continue;
                }

                if ($a['employee_id'] !== $b['employee_id'] || $a['day_of_week'] !== $b['day_of_week']) {
                    continue;
                }

                if ($this->clashes($a, $b)) {
                    $clashes[] = [
                        'employee_id' => $b['employee_id'],
                        'day_of_week' => $b['day_of_week'],
                        'period_slot_id' => $b['period_slot_id'],
                        'reason' => 'Teacher assigned to two overlapping periods within this timetable.',
                    ];
                }
            }
        }

        return $clashes;
    }

    /**
     * Same teacher already booked in another timetable whose period overlaps
     * (same session + day), even if that class runs a different schedule.
     *
     * @param  array<int, array<string, int|null>>  $payload
     * @return array<int, array<string, mixed>>
     */
    private function againstOtherTimetables(Timetable $timetable, array $payload): array
    {
        $employeeIds = collect($payload)->pluck('employee_id')->unique()->all();
        $days = collect($payload)->pluck('day_of_week')->unique()->all();

        // Candidate entries: same teacher + day in OTHER timetables of this
        // session. We can no longer pre-filter by period_slot_id (different
        // classes use different slots for the same time), so we compare windows.
        $existing = TimetableEntry::query()
            ->whereIn('employee_id', $employeeIds)
            ->whereIn('day_of_week', $days)
            ->whereHas('timetable', function ($query) use ($timetable) {
                $query->where('academic_session_id', $timetable->academic_session_id)
                    ->whereKeyNot($timetable->id);
            })
            ->with(['periodSlot', 'timetable.schoolClass', 'timetable.section'])
            ->get();

        if ($existing->isEmpty()) {
            return [];
        }

        $byTeacherDay = $existing->groupBy(fn (TimetableEntry $e) => $e->employee_id.'-'.$e->day_of_week);
        $clashes = [];

        foreach ($payload as $entry) {
            $candidates = $byTeacherDay->get($entry['employee_id'].'-'.$entry['day_of_week']);
            if ($candidates === null) {
                continue;
            }

            foreach ($candidates as $other) {
                $otherWindow = [
                    'period_slot_id' => $other->period_slot_id,
                    'start' => $this->toMinutes($other->periodSlot?->start_time),
                    'end' => $this->toMinutes($other->periodSlot?->end_time),
                ];

                if (! $this->clashes($entry, $otherWindow)) {
                    continue;
                }

                $className = $other->timetable?->schoolClass?->name ?? 'another class';
                $sectionName = $other->timetable?->section?->name;
                $where = $sectionName ? "{$className} - {$sectionName}" : $className;

                $clashes[] = [
                    'employee_id' => $entry['employee_id'],
                    'day_of_week' => $entry['day_of_week'],
                    'period_slot_id' => $entry['period_slot_id'],
                    'reason' => "Teacher is already booked for {$where} at an overlapping time.",
                ];

                break; // one clash per payload entry is enough to block it
            }
        }

        return $clashes;
    }

    /**
     * Do two periods clash? Overlapping clock windows when both have times,
     * otherwise the legacy same-slot rule.
     *
     * Half-open intervals (`<`, not `<=`) so adjacent periods (08:00–08:45 and
     * 08:45–09:30) do NOT clash.
     *
     * @param  array<string, int|null>  $a
     * @param  array<string, int|null>  $b
     */
    private function clashes(array $a, array $b): bool
    {
        if ($a['start'] !== null && $a['end'] !== null && $b['start'] !== null && $b['end'] !== null) {
            return $a['start'] < $b['end'] && $b['start'] < $a['end'];
        }

        return $a['period_slot_id'] === $b['period_slot_id'];
    }

    /**
     * Load start/end times (as minutes-since-midnight) for a set of slot ids.
     *
     * @param  array<int, int>  $slotIds
     * @return array<int, array{start:int|null, end:int|null}>
     */
    private function slotTimes(array $slotIds): array
    {
        if ($slotIds === []) {
            return [];
        }

        return PeriodSlot::query()
            ->whereIn('id', $slotIds)
            ->get()
            ->mapWithKeys(fn (PeriodSlot $slot) => [
                $slot->id => [
                    'start' => $this->toMinutes($slot->start_time),
                    'end' => $this->toMinutes($slot->end_time),
                ],
            ])
            ->all();
    }

    private function toMinutes(?string $time): ?int
    {
        if ($time === null || $time === '') {
            return null;
        }

        [$hours, $minutes] = array_pad(explode(':', $time), 2, '0');

        return ((int) $hours * 60) + (int) $minutes;
    }

    /**
     * Build a flat label map so the controller can format a readable 422.
     *
     * @param  array<int, array<string, mixed>>  $clashes
     * @return array<string, array<int, string>>
     */
    public function toValidationErrors(array $clashes): array
    {
        if ($clashes === []) {
            return [];
        }

        $employees = Employee::query()
            ->whereIn('id', collect($clashes)->pluck('employee_id')->unique()->all())
            ->get()
            ->keyBy('id');

        $slots = PeriodSlot::query()
            ->whereIn('id', collect($clashes)->pluck('period_slot_id')->unique()->all())
            ->get()
            ->keyBy('id');

        $days = [1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday'];

        $messages = collect($clashes)->map(function (array $clash) use ($employees, $slots, $days) {
            $teacher = $employees->get($clash['employee_id'])?->full_name ?? 'Teacher';
            $slot = $slots->get($clash['period_slot_id'])?->name ?? 'period';
            $day = $days[$clash['day_of_week']] ?? 'day';

            return "{$teacher} — {$day}, {$slot}: {$clash['reason']}";
        })->values()->all();

        return ['entries' => $messages];
    }
}

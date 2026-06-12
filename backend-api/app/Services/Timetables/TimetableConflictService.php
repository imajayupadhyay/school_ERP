<?php

namespace App\Services\Timetables;

use App\Models\Employee;
use App\Models\PeriodSlot;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use Illuminate\Support\Collection;

/**
 * The "block + warn" core of the timetable module.
 *
 * Given the entries an admin wants to save onto a timetable, it finds any
 * teacher who would be double-booked — either twice inside the same submission,
 * or against an already-saved entry in another class-section timetable for the
 * same academic session, day, and period. The controller turns the returned
 * clashes into a 422 so a teacher can never be in two rooms at once.
 */
class TimetableConflictService
{
    /**
     * @param  array<int, array{day_of_week:int, period_slot_id:int, subject_id:int, employee_id:int}>  $entries
     * @return array<int, array<string, mixed>>  Human-readable clash descriptions.
     */
    public function detect(Timetable $timetable, array $entries): array
    {
        $clashes = [];
        $clashes = array_merge($clashes, $this->withinPayload($entries));
        $clashes = array_merge($clashes, $this->againstOtherTimetables($timetable, $entries));

        return $clashes;
    }

    /**
     * Same teacher placed in two cells of the same day+period in one submission.
     *
     * @param  array<int, array<string, int>>  $entries
     * @return array<int, array<string, mixed>>
     */
    private function withinPayload(array $entries): array
    {
        $seen = [];
        $clashes = [];

        foreach ($entries as $entry) {
            $key = $entry['employee_id'].'-'.$entry['day_of_week'].'-'.$entry['period_slot_id'];

            if (isset($seen[$key])) {
                $clashes[] = [
                    'employee_id' => $entry['employee_id'],
                    'day_of_week' => $entry['day_of_week'],
                    'period_slot_id' => $entry['period_slot_id'],
                    'reason' => 'Teacher assigned to two subjects in the same period within this timetable.',
                ];

                continue;
            }

            $seen[$key] = true;
        }

        return $clashes;
    }

    /**
     * Same teacher already booked in another timetable (same session/day/period).
     *
     * @param  array<int, array<string, int>>  $entries
     * @return array<int, array<string, mixed>>
     */
    private function againstOtherTimetables(Timetable $timetable, array $entries): array
    {
        if ($entries === []) {
            return [];
        }

        $employeeIds = collect($entries)->pluck('employee_id')->unique()->all();
        $slotIds = collect($entries)->pluck('period_slot_id')->unique()->all();
        $days = collect($entries)->pluck('day_of_week')->unique()->all();

        // All existing entries (in OTHER timetables of the same session) that could
        // collide with this submission, keyed for O(1) lookup.
        $existing = TimetableEntry::query()
            ->whereIn('employee_id', $employeeIds)
            ->whereIn('period_slot_id', $slotIds)
            ->whereIn('day_of_week', $days)
            ->whereHas('timetable', function ($query) use ($timetable) {
                $query->where('academic_session_id', $timetable->academic_session_id)
                    ->whereKeyNot($timetable->id);
            })
            ->with('timetable.schoolClass', 'timetable.section')
            ->get();

        if ($existing->isEmpty()) {
            return [];
        }

        $byKey = $existing->groupBy(fn (TimetableEntry $e) => $e->employee_id.'-'.$e->day_of_week.'-'.$e->period_slot_id);
        $clashes = [];

        foreach ($entries as $entry) {
            $key = $entry['employee_id'].'-'.$entry['day_of_week'].'-'.$entry['period_slot_id'];
            $hit = $byKey->get($key);

            if ($hit === null) {
                continue;
            }

            /** @var TimetableEntry $other */
            $other = $hit->first();
            $className = $other->timetable?->schoolClass?->name ?? 'another class';
            $sectionName = $other->timetable?->section?->name;
            $where = $sectionName ? "{$className} - {$sectionName}" : $className;

            $clashes[] = [
                'employee_id' => $entry['employee_id'],
                'day_of_week' => $entry['day_of_week'],
                'period_slot_id' => $entry['period_slot_id'],
                'reason' => "Teacher is already booked for {$where} in this period.",
            ];
        }

        return $clashes;
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

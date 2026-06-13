<?php

namespace App\Http\Requests\Timetables;

use App\Models\Employee;
use App\Models\Timetable;
use App\Services\Timetables\PeriodSlotResolver;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class TimetableEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $schoolId = $this->user()?->school_id;

        return [
            'entries' => ['present', 'array'],
            'entries.*.day_of_week' => ['required', 'integer', 'between:1,6'],
            'entries.*.period_slot_id' => [
                'required',
                'integer',
                // Existence-only here; the authoritative "belongs to this class's
                // effective (non-break) schedule" check runs in after().
                Rule::exists('period_slots', 'id')->where('school_id', $schoolId),
            ],
            'entries.*.subject_id' => [
                'required',
                'integer',
                Rule::exists('subjects', 'id')->where('school_id', $schoolId),
            ],
            'entries.*.employee_id' => [
                'required',
                'integer',
                Rule::exists('employees', 'id')->where('school_id', $schoolId),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'entries.*.period_slot_id.exists' => 'A selected period is invalid.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $timetable = $this->route('timetable');
                $timetable = $timetable instanceof Timetable ? $timetable : null;
                $schoolId = $this->user()?->school_id;
                $entries = $this->input('entries', []);

                if (! is_array($entries) || $timetable === null) {
                    return;
                }

                // Subjects mapped to this timetable's class.
                $mappedSubjects = DB::table('class_subject')
                    ->where('school_id', $schoolId)
                    ->where('class_id', $timetable->class_id)
                    ->pluck('subject_id')
                    ->all();

                // Teaching, active employees only.
                $teacherIds = Employee::forSchool($schoolId)
                    ->where('employee_type', 'teaching')
                    ->where('status', 'active')
                    ->pluck('id')
                    ->all();

                // Period slots that actually belong to this class's schedule
                // (its own override, else the school default), excluding breaks.
                $effectiveSlotIds = app(PeriodSlotResolver::class)
                    ->effectiveSlotIdsForClass($timetable->class_id);

                $seenCells = [];

                foreach ($entries as $index => $entry) {
                    $subjectId = (int) ($entry['subject_id'] ?? 0);
                    $employeeId = (int) ($entry['employee_id'] ?? 0);
                    $day = (int) ($entry['day_of_week'] ?? 0);
                    $slotId = (int) ($entry['period_slot_id'] ?? 0);

                    if ($subjectId !== 0 && ! in_array($subjectId, $mappedSubjects, true)) {
                        $validator->errors()->add("entries.$index.subject_id", 'The selected subject is not assigned to this class.');
                    }

                    if ($employeeId !== 0 && ! in_array($employeeId, $teacherIds, true)) {
                        $validator->errors()->add("entries.$index.employee_id", 'The selected staff member is not an active teacher.');
                    }

                    if ($slotId !== 0 && ! in_array($slotId, $effectiveSlotIds, true)) {
                        $validator->errors()->add("entries.$index.period_slot_id", 'The selected period is not part of this class\'s schedule.');
                    }

                    $cellKey = $day.'-'.$slotId;
                    if (isset($seenCells[$cellKey])) {
                        $validator->errors()->add("entries.$index.period_slot_id", 'This day and period already has a class in this timetable.');
                    }
                    $seenCells[$cellKey] = true;
                }
            },
        ];
    }
}

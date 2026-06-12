<?php

namespace App\Http\Requests\Exams;

use App\Models\ExamSchedule;
use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ExamMarksRequest extends FormRequest
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
        /** @var ExamSchedule $schedule */
        $schedule = $this->route('examSchedule');
        $schoolId = $schedule->school_id;

        return [
            'status' => ['nullable', 'in:draft,submitted'],
            'records' => ['required', 'array', 'min:1', 'max:300'],
            'records.*.student_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('students', 'id')->where('school_id', $schoolId),
            ],
            'records.*.marks_obtained' => ['nullable', 'numeric', 'gte:0', 'lte:'.$schedule->max_marks],
            'records.*.attendance_status' => ['required', 'in:present,absent,exempt'],
            'records.*.remarks' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                /** @var ExamSchedule $schedule */
                $schedule = $this->route('examSchedule');
                $studentIds = collect($this->input('records', []))->pluck('student_id')->filter()->unique();

                $students = Student::forSchool($schedule->school_id)
                    ->whereIn('id', $studentIds)
                    ->get(['id', 'academic_session_id', 'class_id', 'section_id', 'status']);

                if ($students->count() !== $studentIds->count()) {
                    $validator->errors()->add('records', 'One or more students do not belong to this school.');

                    return;
                }

                $invalid = $students->first(function (Student $student) use ($schedule) {
                    if ($student->status !== 'active'
                        || (int) $student->academic_session_id !== (int) $schedule->exam->academic_session_id
                        || (int) $student->class_id !== (int) $schedule->class_id) {
                        return true;
                    }

                    return $schedule->section_id !== null
                        && (int) $student->section_id !== (int) $schedule->section_id;
                });

                if ($invalid !== null) {
                    $validator->errors()->add('records', 'Marks can only include active students from the schedule roster.');
                }

                foreach ($this->input('records', []) as $index => $record) {
                    $attendance = $record['attendance_status'] ?? null;
                    $marks = $record['marks_obtained'] ?? null;

                    if ($attendance === 'present' && ($marks === null || $marks === '')) {
                        $validator->errors()->add("records.$index.marks_obtained", 'Marks are required for present students.');
                    }

                    if (in_array($attendance, ['absent', 'exempt'], true) && $marks !== null && $marks !== '') {
                        $validator->errors()->add("records.$index.marks_obtained", 'Marks must be empty for absent or exempt students.');
                    }
                }
            },
        ];
    }
}

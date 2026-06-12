<?php

namespace App\Http\Requests\Attendance;

use App\Models\AcademicSession;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class MarkAttendanceRequest extends FormRequest
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
            'academic_session_id' => [
                'required',
                'integer',
                Rule::exists('academic_sessions', 'id')->where('school_id', $schoolId),
            ],
            'class_id' => [
                'required',
                'integer',
                Rule::exists('classes', 'id')->where('school_id', $schoolId),
            ],
            'section_id' => [
                'nullable',
                'integer',
                Rule::exists('sections', 'id')->where('school_id', $schoolId),
            ],
            'attendance_date' => ['required', 'date'],
            'status' => ['nullable', 'in:draft,submitted'],
            'remarks' => ['nullable', 'string', 'max:255'],
            'records' => ['required', 'array', 'min:1', 'max:250'],
            'records.*.student_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('students', 'id')->where('school_id', $schoolId),
            ],
            'records.*.status' => ['required', 'in:present,absent,late,half_day,excused'],
            'records.*.remarks' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $schoolId = $this->user()?->school_id;
                $sessionId = $this->integer('academic_session_id');
                $classId = $this->integer('class_id');
                $sectionId = $this->integer('section_id') ?: null;

                if ($sectionId !== null) {
                    $sectionMatchesClass = Section::forSchool($schoolId)
                        ->whereKey($sectionId)
                        ->where('class_id', $classId)
                        ->exists();

                    if (! $sectionMatchesClass) {
                        $validator->errors()->add('section_id', 'The selected section does not belong to the selected class.');
                    }
                }

                $session = AcademicSession::forSchool($schoolId)->find($sessionId);
                if ($session !== null && $this->filled('attendance_date')) {
                    $date = Carbon::parse($this->input('attendance_date'))->startOfDay();
                    if ($date->lt($session->start_date->startOfDay()) || $date->gt($session->end_date->startOfDay())) {
                        $validator->errors()->add('attendance_date', 'The attendance date must fall inside the selected academic session.');
                    }
                }

                $studentIds = collect($this->input('records', []))
                    ->pluck('student_id')
                    ->filter()
                    ->unique()
                    ->values();

                if ($studentIds->isEmpty()) {
                    return;
                }

                $students = Student::forSchool($schoolId)
                    ->whereIn('id', $studentIds)
                    ->get(['id', 'academic_session_id', 'class_id', 'section_id', 'status']);

                if ($students->count() !== $studentIds->count()) {
                    $validator->errors()->add('records', 'One or more students do not belong to this school.');

                    return;
                }

                $invalidStudent = $students->first(function (Student $student) use ($sessionId, $classId, $sectionId) {
                    if ($student->status !== 'active') {
                        return true;
                    }

                    if ((int) $student->academic_session_id !== $sessionId || (int) $student->class_id !== $classId) {
                        return true;
                    }

                    return $sectionId !== null && (int) $student->section_id !== $sectionId;
                });

                if ($invalidStudent !== null) {
                    $validator->errors()->add('records', 'Attendance records can only include active students from the selected class, section, and academic session.');
                }
            },
        ];
    }
}

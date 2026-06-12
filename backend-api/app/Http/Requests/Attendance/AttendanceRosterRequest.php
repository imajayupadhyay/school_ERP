<?php

namespace App\Http\Requests\Attendance;

use App\Models\AcademicSession;
use App\Models\Section;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class AttendanceRosterRequest extends FormRequest
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
            },
        ];
    }
}

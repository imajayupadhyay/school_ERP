<?php

namespace App\Http\Requests\Students;

use App\Models\Section;
use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class TransferStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Student $student */
        $student = $this->route('student');
        $schoolId = $student->school_id;

        return [
            'transfer_type' => ['required', 'in:internal,outgoing'],
            'academic_session_id' => [
                'nullable',
                'integer',
                Rule::exists('academic_sessions', 'id')->where('school_id', $schoolId),
            ],
            'class_id' => [
                'required_if:transfer_type,internal',
                'nullable',
                'integer',
                Rule::exists('classes', 'id')->where('school_id', $schoolId),
            ],
            'section_id' => [
                'nullable',
                'integer',
                Rule::exists('sections', 'id')->where('school_id', $schoolId),
            ],
            'roll_no' => ['nullable', 'string', 'max:30'],
            'transfer_date' => ['nullable', 'date'],
            'transfer_reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                /** @var Student $student */
                $student = $this->route('student');
                $schoolId = $student->school_id;
                $classId = $this->integer('class_id') ?: null;
                $sectionId = $this->integer('section_id') ?: null;
                $sessionId = $this->integer('academic_session_id') ?: $student->academic_session_id;
                $rollNo = $this->input('roll_no');

                if ($this->input('transfer_type') === 'outgoing') {
                    return;
                }

                if ($sectionId !== null && $classId !== null) {
                    $sectionMatchesClass = Section::forSchool($schoolId)
                        ->whereKey($sectionId)
                        ->where('class_id', $classId)
                        ->exists();

                    if (! $sectionMatchesClass) {
                        $validator->errors()->add('section_id', 'The selected section does not belong to the selected class.');
                    }
                }

                if ($rollNo && $classId !== null) {
                    $duplicateRoll = Student::forSchool($schoolId)
                        ->where('roll_no', $rollNo)
                        ->where('academic_session_id', $sessionId)
                        ->where('class_id', $classId)
                        ->where('section_id', $sectionId)
                        ->whereKeyNot($student->id)
                        ->exists();

                    if ($duplicateRoll) {
                        $validator->errors()->add('roll_no', 'This roll number is already assigned in the selected class, section, and session.');
                    }
                }
            },
        ];
    }
}

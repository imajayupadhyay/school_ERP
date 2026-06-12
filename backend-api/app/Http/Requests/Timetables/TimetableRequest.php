<?php

namespace App\Http\Requests\Timetables;

use App\Models\Section;
use App\Models\Timetable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class TimetableRequest extends FormRequest
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
                'required',
                'integer',
                Rule::exists('sections', 'id')->where('school_id', $schoolId),
            ],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $schoolId = $this->user()?->school_id;
                $classId = $this->integer('class_id');
                $sectionId = $this->integer('section_id');
                $sessionId = $this->integer('academic_session_id');

                if ($sectionId !== 0 && $classId !== 0) {
                    $matches = Section::forSchool($schoolId)
                        ->whereKey($sectionId)
                        ->where('class_id', $classId)
                        ->exists();

                    if (! $matches) {
                        $validator->errors()->add('section_id', 'The selected section does not belong to the selected class.');
                    }
                }

                $duplicate = Timetable::forSchool($schoolId)
                    ->where('academic_session_id', $sessionId)
                    ->where('class_id', $classId)
                    ->where('section_id', $sectionId)
                    ->exists();

                if ($duplicate) {
                    $validator->errors()->add('section_id', 'A timetable already exists for this class and section in the selected session.');
                }
            },
        ];
    }
}

<?php

namespace App\Http\Requests\Students;

use App\Models\Section;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class PromoteStudentsRequest extends FormRequest
{
    private const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && in_array($user->role, self::EDITOR_ROLES, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $schoolId = $this->user()->school_id;

        return [
            'from_academic_session_id' => [
                'nullable',
                'integer',
                Rule::exists('academic_sessions', 'id')->where('school_id', $schoolId),
            ],
            'to_academic_session_id' => [
                'nullable',
                'integer',
                Rule::exists('academic_sessions', 'id')->where('school_id', $schoolId),
            ],
            'from_class_id' => [
                'required',
                'integer',
                Rule::exists('classes', 'id')->where('school_id', $schoolId),
            ],
            'from_section_id' => [
                'nullable',
                'integer',
                Rule::exists('sections', 'id')->where('school_id', $schoolId),
            ],
            'to_class_id' => [
                'required',
                'integer',
                Rule::exists('classes', 'id')->where('school_id', $schoolId),
            ],
            'to_section_id' => [
                'nullable',
                'integer',
                Rule::exists('sections', 'id')->where('school_id', $schoolId),
            ],
            'student_ids' => ['nullable', 'array', 'max:500'],
            'student_ids.*' => [
                'integer',
                Rule::exists('students', 'id')->where('school_id', $schoolId),
            ],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $schoolId = $this->user()->school_id;

                foreach ([
                    ['field' => 'from_section_id', 'class' => 'from_class_id'],
                    ['field' => 'to_section_id', 'class' => 'to_class_id'],
                ] as $pair) {
                    $sectionId = $this->integer($pair['field']) ?: null;
                    $classId = $this->integer($pair['class']) ?: null;

                    if ($sectionId === null || $classId === null) {
                        continue;
                    }

                    $sectionMatchesClass = Section::forSchool($schoolId)
                        ->whereKey($sectionId)
                        ->where('class_id', $classId)
                        ->exists();

                    if (! $sectionMatchesClass) {
                        $validator->errors()->add($pair['field'], 'The selected section does not belong to the selected class.');
                    }
                }
            },
        ];
    }
}

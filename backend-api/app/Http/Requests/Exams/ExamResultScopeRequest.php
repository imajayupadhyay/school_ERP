<?php

namespace App\Http\Requests\Exams;

use App\Models\Section;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ExamResultScopeRequest extends FormRequest
{
    private const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function authorize(): bool
    {
        return $this->user() !== null && in_array($this->user()->role, self::MANAGER_ROLES, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $schoolId = $this->user()?->school_id;

        return [
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
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $sectionId = $this->integer('section_id') ?: null;
                $classId = $this->integer('class_id');

                if ($sectionId === null) {
                    return;
                }

                $matches = Section::forSchool($this->user()->school_id)
                    ->whereKey($sectionId)
                    ->where('class_id', $classId)
                    ->exists();

                if (! $matches) {
                    $validator->errors()->add('section_id', 'The selected section does not belong to the selected class.');
                }
            },
        ];
    }
}

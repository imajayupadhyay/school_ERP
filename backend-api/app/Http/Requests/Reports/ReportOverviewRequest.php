<?php

namespace App\Http\Requests\Reports;

use App\Models\Section;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReportOverviewRequest extends FormRequest
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
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'academic_session_id' => [
                'nullable',
                'integer',
                Rule::exists('academic_sessions', 'id')->where('school_id', $schoolId),
            ],
            'class_id' => [
                'nullable',
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
                $schoolId = $this->user()?->school_id;
                $classId = $this->integer('class_id') ?: null;
                $sectionId = $this->integer('section_id') ?: null;

                if ($sectionId !== null && $classId === null) {
                    $validator->errors()->add('class_id', 'Select a class before selecting a section.');
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
            },
        ];
    }
}

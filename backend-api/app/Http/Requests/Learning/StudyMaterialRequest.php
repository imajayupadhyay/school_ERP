<?php

namespace App\Http\Requests\Learning;

use App\Models\Section;
use App\Models\StudyMaterial;
use App\Models\Subject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StudyMaterialRequest extends FormRequest
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
        $material = $this->route('studyMaterial');
        $material = $material instanceof StudyMaterial ? $material : null;
        $schoolId = $this->user()?->school_id ?? $material?->school_id;

        return [
            'academic_session_id' => [
                'nullable',
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
            'subject_id' => [
                'nullable',
                'integer',
                Rule::exists('subjects', 'id')->where('school_id', $schoolId),
            ],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:5000'],
            'material_type' => ['required', 'in:document,video,link,note,worksheet'],
            'content_url' => ['nullable', 'url', 'max:500'],
            'status' => ['nullable', 'in:draft,published,archived'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $material = $this->route('studyMaterial');
                $material = $material instanceof StudyMaterial ? $material : null;
                $schoolId = $this->user()?->school_id ?? $material?->school_id;
                $classId = $this->integer('class_id') ?: null;
                $sectionId = $this->integer('section_id') ?: null;
                $subjectId = $this->integer('subject_id') ?: null;
                $materialType = $this->input('material_type');

                if (in_array($materialType, ['video', 'link'], true) && ! $this->filled('content_url')) {
                    $validator->errors()->add('content_url', 'A URL is required for video and link materials.');
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

                if ($subjectId !== null && $classId !== null) {
                    $subjectExists = Subject::forSchool($schoolId)->whereKey($subjectId)->exists();
                    $subjectAssignedToClass = DB::table('class_subject')
                        ->where('school_id', $schoolId)
                        ->where('class_id', $classId)
                        ->where('subject_id', $subjectId)
                        ->exists();

                    if ($subjectExists && ! $subjectAssignedToClass) {
                        $validator->errors()->add('subject_id', 'The selected subject is not assigned to the selected class.');
                    }
                }
            },
        ];
    }
}

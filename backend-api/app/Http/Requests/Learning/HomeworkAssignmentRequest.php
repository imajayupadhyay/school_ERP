<?php

namespace App\Http\Requests\Learning;

use App\Models\HomeworkAssignment;
use App\Models\Section;
use App\Models\Subject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class HomeworkAssignmentRequest extends FormRequest
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
        $homework = $this->route('homeworkAssignment');
        $homework = $homework instanceof HomeworkAssignment ? $homework : null;
        $schoolId = $this->user()?->school_id ?? $homework?->school_id;

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
            'instructions' => ['nullable', 'string', 'max:5000'],
            'assigned_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:assigned_date'],
            'submission_required' => ['sometimes', 'boolean'],
            'status' => ['nullable', 'in:draft,published,archived'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $homework = $this->route('homeworkAssignment');
                $homework = $homework instanceof HomeworkAssignment ? $homework : null;
                $schoolId = $this->user()?->school_id ?? $homework?->school_id;
                $classId = $this->integer('class_id') ?: null;
                $sectionId = $this->integer('section_id') ?: null;
                $subjectId = $this->integer('subject_id') ?: null;

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

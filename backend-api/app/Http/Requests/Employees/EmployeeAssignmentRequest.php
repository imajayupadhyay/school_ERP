<?php

namespace App\Http\Requests\Employees;

use App\Models\Employee;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Subject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class EmployeeAssignmentRequest extends FormRequest
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
        /** @var Employee $employee */
        $employee = $this->route('employee');
        $schoolId = $employee->school_id;

        return [
            'assignments' => ['present', 'array', 'max:100'],
            'assignments.*.assignment_type' => ['required', 'in:class_teacher,subject_teacher'],
            'assignments.*.class_id' => [
                'required',
                'integer',
                Rule::exists('classes', 'id')->where('school_id', $schoolId),
            ],
            'assignments.*.section_id' => [
                'nullable',
                'integer',
                Rule::exists('sections', 'id')->where('school_id', $schoolId),
            ],
            'assignments.*.subject_id' => [
                'nullable',
                'integer',
                Rule::exists('subjects', 'id')->where('school_id', $schoolId),
            ],
            'assignments.*.status' => ['nullable', 'in:active,archived'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                /** @var Employee $employee */
                $employee = $this->route('employee');
                $schoolId = $employee->school_id;
                $seen = [];

                foreach ($this->input('assignments', []) as $index => $assignment) {
                    $type = $assignment['assignment_type'] ?? null;
                    $classId = (int) ($assignment['class_id'] ?? 0);
                    $sectionId = isset($assignment['section_id']) ? (int) $assignment['section_id'] : null;
                    $subjectId = isset($assignment['subject_id']) ? (int) $assignment['subject_id'] : null;

                    if ($type === 'subject_teacher' && ! $subjectId) {
                        $validator->errors()->add("assignments.$index.subject_id", 'A subject is required for subject teacher assignments.');
                    }

                    if ($type === 'class_teacher' && $subjectId) {
                        $validator->errors()->add("assignments.$index.subject_id", 'Class teacher assignments cannot include a subject.');
                    }

                    if ($classId && ! SchoolClass::forSchool($schoolId)->whereKey($classId)->exists()) {
                        continue;
                    }

                    if ($sectionId) {
                        $sectionMatchesClass = Section::forSchool($schoolId)
                            ->whereKey($sectionId)
                            ->where('class_id', $classId)
                            ->exists();

                        if (! $sectionMatchesClass) {
                            $validator->errors()->add("assignments.$index.section_id", 'The selected section does not belong to the selected class.');
                        }
                    }

                    if ($subjectId) {
                        $subjectExists = Subject::forSchool($schoolId)->whereKey($subjectId)->exists();
                        $subjectAssignedToClass = DB::table('class_subject')
                            ->where('school_id', $schoolId)
                            ->where('class_id', $classId)
                            ->where('subject_id', $subjectId)
                            ->exists();

                        if ($subjectExists && ! $subjectAssignedToClass) {
                            $validator->errors()->add("assignments.$index.subject_id", 'The selected subject is not assigned to the selected class.');
                        }
                    }

                    $key = implode(':', [$type, $classId, $sectionId ?: 0, $subjectId ?: 0]);

                    if (isset($seen[$key])) {
                        $validator->errors()->add("assignments.$index.class_id", 'Duplicate assignment rows are not allowed.');
                    }

                    $seen[$key] = true;
                }
            },
        ];
    }
}

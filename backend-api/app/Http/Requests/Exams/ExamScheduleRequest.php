<?php

namespace App\Http\Requests\Exams;

use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Models\Section;
use App\Models\Subject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ExamScheduleRequest extends FormRequest
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
        $schedule = $this->route('examSchedule');
        $schedule = $schedule instanceof ExamSchedule ? $schedule : null;
        $schoolId = $this->user()?->school_id ?? $schedule?->school_id;

        return [
            'exam_id' => [
                'required',
                'integer',
                Rule::exists('exams', 'id')->where('school_id', $schoolId),
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
                'required',
                'integer',
                Rule::exists('subjects', 'id')->where('school_id', $schoolId),
            ],
            'exam_date' => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'max_marks' => ['required', 'numeric', 'gt:0', 'max:10000'],
            'passing_marks' => ['required', 'numeric', 'gte:0', 'lte:max_marks'],
            'room' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', 'in:scheduled,completed,cancelled'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $schedule = $this->route('examSchedule');
                $schedule = $schedule instanceof ExamSchedule ? $schedule : null;
                $schoolId = $this->user()?->school_id ?? $schedule?->school_id;
                $examId = $this->integer('exam_id');
                $classId = $this->integer('class_id');
                $sectionId = $this->integer('section_id') ?: null;
                $subjectId = $this->integer('subject_id');

                if ($sectionId !== null) {
                    $matches = Section::forSchool($schoolId)
                        ->whereKey($sectionId)
                        ->where('class_id', $classId)
                        ->exists();

                    if (! $matches) {
                        $validator->errors()->add('section_id', 'The selected section does not belong to the selected class.');
                    }
                }

                $subjectExists = Subject::forSchool($schoolId)->whereKey($subjectId)->exists();
                $mapped = DB::table('class_subject')
                    ->where('school_id', $schoolId)
                    ->where('class_id', $classId)
                    ->where('subject_id', $subjectId)
                    ->exists();

                if ($subjectExists && ! $mapped) {
                    $validator->errors()->add('subject_id', 'The selected subject is not assigned to the selected class.');
                }

                $exam = Exam::forSchool($schoolId)->find($examId);
                if ($exam !== null && $this->filled('exam_date')) {
                    $date = Carbon::parse($this->input('exam_date'));
                    if ($date->lt($exam->start_date) || $date->gt($exam->end_date)) {
                        $validator->errors()->add('exam_date', 'The schedule date must fall inside the exam date range.');
                    }
                }

                $duplicate = ExamSchedule::forSchool($schoolId)
                    ->where('exam_id', $examId)
                    ->where('class_id', $classId)
                    ->where('section_id', $sectionId)
                    ->where('subject_id', $subjectId)
                    ->when($schedule, fn ($query) => $query->whereKeyNot($schedule->id))
                    ->exists();

                if ($duplicate) {
                    $validator->errors()->add('subject_id', 'This subject already has a schedule for the selected exam, class, and section.');
                }
            },
        ];
    }
}

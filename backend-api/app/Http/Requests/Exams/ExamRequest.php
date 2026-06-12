<?php

namespace App\Http\Requests\Exams;

use App\Models\AcademicSession;
use App\Models\Exam;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ExamRequest extends FormRequest
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
        $exam = $this->route('exam');
        $exam = $exam instanceof Exam ? $exam : null;
        $schoolId = $this->user()?->school_id ?? $exam?->school_id;

        return [
            'academic_session_id' => [
                'required',
                'integer',
                Rule::exists('academic_sessions', 'id')->where('school_id', $schoolId),
            ],
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('exams', 'name')
                    ->where('school_id', $schoolId)
                    ->where('academic_session_id', $this->integer('academic_session_id'))
                    ->ignore($exam?->id),
            ],
            'exam_type' => ['required', 'in:unit_test,term,midterm,final,practical,other'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status' => ['nullable', 'in:draft,scheduled,completed,archived'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $schoolId = $this->user()?->school_id;
                $sessionId = $this->integer('academic_session_id');
                $session = AcademicSession::forSchool($schoolId)->find($sessionId);

                if ($session === null || ! $this->filled('start_date') || ! $this->filled('end_date')) {
                    return;
                }

                $start = Carbon::parse($this->input('start_date'));
                $end = Carbon::parse($this->input('end_date'));

                if ($start->lt($session->start_date) || $end->gt($session->end_date)) {
                    $validator->errors()->add('start_date', 'Exam dates must fall inside the selected academic session.');
                }
            },
        ];
    }
}

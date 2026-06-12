<?php

namespace App\Http\Requests\Guardians;

use App\Models\Guardian;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SyncGuardianStudentsRequest extends FormRequest
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
        /** @var Guardian $guardian */
        $guardian = $this->route('guardian');
        $schoolId = $guardian->school_id;

        return [
            'students' => ['present', 'array', 'max:20'],
            'students.*.student_id' => [
                'required',
                'integer',
                Rule::exists('students', 'id')->where('school_id', $schoolId),
            ],
            'students.*.relationship' => ['nullable', 'string', 'max:80'],
            'students.*.is_primary' => ['sometimes', 'boolean'],
            'students.*.is_emergency_contact' => ['sometimes', 'boolean'],
            'students.*.pickup_allowed' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $seen = [];

                foreach ($this->input('students', []) as $index => $row) {
                    $studentId = $row['student_id'] ?? null;

                    if ($studentId === null) {
                        continue;
                    }

                    if (isset($seen[$studentId])) {
                        $validator->errors()->add("students.$index.student_id", 'Duplicate student links are not allowed.');
                    }

                    $seen[$studentId] = true;
                }
            },
        ];
    }
}

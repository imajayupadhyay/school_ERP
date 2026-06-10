<?php

namespace App\Http\Requests\Academic;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncSubjectClassesRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && in_array($user->role, ['school_admin', 'principal', 'super_admin'], true);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $schoolId = $this->user()->school_id;

        return [
            'class_ids' => ['present', 'array'],
            'class_ids.*' => [
                'integer',
                Rule::exists('classes', 'id')->where('school_id', $schoolId),
            ],
        ];
    }
}

<?php

namespace App\Http\Requests\Academic;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubjectRequest extends FormRequest
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
            'name' => [
                'required', 'string', 'max:100',
                Rule::unique('subjects', 'name')
                    ->where('school_id', $schoolId)
                    ->ignore($this->route('subject')),
            ],
            'code' => ['nullable', 'string', 'max:20'],
            'type' => ['nullable', 'in:theory,practical'],
            'status' => ['nullable', 'in:active,archived'],
        ];
    }
}

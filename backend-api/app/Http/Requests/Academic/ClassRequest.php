<?php

namespace App\Http\Requests\Academic;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClassRequest extends FormRequest
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
                Rule::unique('classes', 'name')
                    ->where('school_id', $schoolId)
                    ->ignore($this->route('class')),
            ],
            'sequence' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'in:active,archived'],
        ];
    }
}

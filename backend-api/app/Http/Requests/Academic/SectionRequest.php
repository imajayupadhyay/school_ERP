<?php

namespace App\Http\Requests\Academic;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SectionRequest extends FormRequest
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
            'class_id' => [
                'required', 'integer',
                Rule::exists('classes', 'id')->where('school_id', $schoolId),
            ],
            'name' => [
                'required', 'string', 'max:50',
                Rule::unique('sections', 'name')
                    ->where('class_id', $this->input('class_id'))
                    ->ignore($this->route('section')),
            ],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'in:active,archived'],
        ];
    }
}

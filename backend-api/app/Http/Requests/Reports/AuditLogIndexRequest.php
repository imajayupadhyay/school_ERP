<?php

namespace App\Http\Requests\Reports;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AuditLogIndexRequest extends FormRequest
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
        $schoolId = $this->user()?->school_id;

        return [
            'search' => ['nullable', 'string', 'max:120'],
            'module' => ['nullable', 'string', 'max:60'],
            'action' => ['nullable', 'string', 'max:120'],
            'user_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where('school_id', $schoolId),
            ],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:50'],
        ];
    }
}

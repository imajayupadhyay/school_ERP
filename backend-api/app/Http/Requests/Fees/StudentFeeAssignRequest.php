<?php

namespace App\Http\Requests\Fees;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StudentFeeAssignRequest extends FormRequest
{
    private const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin'];

    private const FREQUENCIES = 'in:one_time,monthly,quarterly,half_yearly,annual';

    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && in_array($user->role, self::EDITOR_ROLES, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $schoolId = $this->user()->school_id;

        return [
            'fee_structure_id' => [
                'required',
                'integer',
                Rule::exists('fee_structures', 'id')->where('school_id', $schoolId),
            ],
            'discount_type' => ['nullable', 'in:none,percent,fixed'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'discount_reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:255'],
            'custom_items' => ['nullable', 'array', 'max:20'],
            'custom_items.*.fee_head_id' => [
                'nullable',
                'integer',
                Rule::exists('fee_heads', 'id')->where('school_id', $schoolId),
            ],
            'custom_items.*.label' => ['required_with:custom_items', 'string', 'max:120'],
            'custom_items.*.amount' => ['required_with:custom_items', 'numeric', 'min:0'],
            'custom_items.*.frequency' => ['nullable', self::FREQUENCIES],
            'custom_items.*.discount_type' => ['nullable', 'in:none,percent,fixed'],
            'custom_items.*.discount_value' => ['nullable', 'numeric', 'min:0'],
            'custom_items.*.discount_reason' => ['nullable', 'string', 'max:255'],
            'custom_items.*.is_optional' => ['sometimes', 'boolean'],
        ];
    }
}

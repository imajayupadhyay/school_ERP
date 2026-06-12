<?php

namespace App\Http\Requests\Fees;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StudentFeeItemsRequest extends FormRequest
{
    private const FREQUENCIES = 'in:one_time,monthly,quarterly,half_yearly,annual';

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
        $schoolId = $this->user()->school_id;

        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.fee_head_id' => [
                'nullable',
                'integer',
                Rule::exists('fee_heads', 'id')->where('school_id', $schoolId),
            ],
            'items.*.label' => ['required', 'string', 'max:120'],
            'items.*.base_amount' => ['required', 'numeric', 'min:0'],
            'items.*.frequency' => ['required', self::FREQUENCIES],
            'items.*.discount_type' => ['nullable', 'in:none,percent,fixed'],
            'items.*.discount_value' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_reason' => ['nullable', 'string', 'max:255'],
            'items.*.is_custom' => ['sometimes', 'boolean'],
            'items.*.is_optional' => ['sometimes', 'boolean'],
        ];
    }
}

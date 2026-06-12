<?php

namespace App\Http\Requests\Fees;

use App\Models\FeeHead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FeeHeadRequest extends FormRequest
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
        $feeHead = $this->route('feeHead');
        $feeHead = $feeHead instanceof FeeHead ? $feeHead : null;
        $schoolId = $this->user()->school_id ?? $feeHead?->school_id;

        return [
            'name' => [
                'required',
                'string',
                'max:120',
                Rule::unique('fee_heads', 'name')
                    ->where('school_id', $schoolId)
                    ->ignore($feeHead?->id),
            ],
            'code' => ['nullable', 'string', 'max:40'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_optional' => ['sometimes', 'boolean'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}

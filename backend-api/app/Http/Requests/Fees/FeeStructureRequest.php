<?php

namespace App\Http\Requests\Fees;

use App\Models\FeeStructure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FeeStructureRequest extends FormRequest
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
        $structure = $this->route('feeStructure');
        $structure = $structure instanceof FeeStructure ? $structure : null;
        $schoolId = $this->user()->school_id ?? $structure?->school_id;

        return [
            'academic_session_id' => [
                'required',
                'integer',
                Rule::exists('academic_sessions', 'id')->where('school_id', $schoolId),
            ],
            'class_id' => [
                'nullable',
                'integer',
                Rule::exists('classes', 'id')->where('school_id', $schoolId),
            ],
            'name' => [
                'required',
                'string',
                'max:120',
                Rule::unique('fee_structures', 'name')
                    ->where('school_id', $schoolId)
                    ->where('academic_session_id', $this->integer('academic_session_id'))
                    ->where('class_id', $this->integer('class_id') ?: null)
                    ->ignore($structure?->id),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.fee_head_id' => [
                'required',
                'integer',
                Rule::exists('fee_heads', 'id')->where('school_id', $schoolId),
            ],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
            'items.*.frequency' => ['required', self::FREQUENCIES],
            'items.*.is_optional' => ['sometimes', 'boolean'],
        ];
    }
}

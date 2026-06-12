<?php

namespace App\Http\Requests\Timetables;

use App\Models\PeriodSlot;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PeriodSlotRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route-level `permission:` middleware is the real gate (supports custom roles).
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $slot = $this->route('periodSlot');
        $slot = $slot instanceof PeriodSlot ? $slot : null;
        $schoolId = $this->user()?->school_id ?? $slot?->school_id;

        return [
            'name' => ['required', 'string', 'max:80'],
            'sequence' => [
                'required',
                'integer',
                'min:1',
                'max:50',
                Rule::unique('period_slots', 'sequence')
                    ->where('school_id', $schoolId)
                    ->ignore($slot?->id),
            ],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'is_break' => ['boolean'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}

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

        // A slot belongs either to the school default set (class_id null) or to a
        // single class override. On update the scope never changes, so derive it
        // from the existing slot; on create it comes from the payload.
        $classId = $slot !== null ? $slot->class_id : ($this->input('class_id') ?: null);

        return [
            'class_id' => [
                'nullable',
                'integer',
                Rule::exists('classes', 'id')->where('school_id', $schoolId),
            ],
            'name' => ['required', 'string', 'max:80'],
            'sequence' => [
                'required',
                'integer',
                'min:1',
                'max:50',
                // Sequence is unique within a scope (default set, or one class).
                // This also guards the school default set, where MySQL's
                // distinct-NULL handling would otherwise allow duplicates.
                Rule::unique('period_slots', 'sequence')
                    ->where('school_id', $schoolId)
                    ->where(fn ($query) => $classId === null
                        ? $query->whereNull('class_id')
                        : $query->where('class_id', $classId))
                    ->ignore($slot?->id),
            ],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'is_break' => ['boolean'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}

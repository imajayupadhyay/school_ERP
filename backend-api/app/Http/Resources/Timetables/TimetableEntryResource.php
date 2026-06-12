<?php

namespace App\Http\Resources\Timetables;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimetableEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'timetable_id' => $this->timetable_id,
            'day_of_week' => $this->day_of_week,
            'period_slot_id' => $this->period_slot_id,
            'subject_id' => $this->subject_id,
            'employee_id' => $this->employee_id,
            'subject' => $this->whenLoaded('subject', fn () => $this->subject ? [
                'id' => $this->subject->id,
                'name' => $this->subject->name,
            ] : null),
            'employee' => $this->whenLoaded('employee', fn () => $this->employee ? [
                'id' => $this->employee->id,
                'name' => $this->employee->full_name,
            ] : null),
            'period_slot' => $this->whenLoaded('periodSlot', fn () => $this->periodSlot
                ? new PeriodSlotResource($this->periodSlot)
                : null),
        ];
    }
}

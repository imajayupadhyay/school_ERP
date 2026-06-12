<?php

namespace App\Http\Resources\Attendance;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceSessionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'academic_session_id' => $this->academic_session_id,
            'class_id' => $this->class_id,
            'section_id' => $this->section_id,
            'attendance_date' => $this->attendance_date?->toDateString(),
            'marked_by' => $this->marked_by,
            'status' => $this->status,
            'remarks' => $this->remarks,
            'academic_session' => $this->whenLoaded('academicSession', fn () => $this->academicSession ? [
                'id' => $this->academicSession->id,
                'name' => $this->academicSession->name,
            ] : null),
            'class' => $this->whenLoaded('schoolClass', fn () => $this->schoolClass ? [
                'id' => $this->schoolClass->id,
                'name' => $this->schoolClass->name,
            ] : null),
            'section' => $this->whenLoaded('section', fn () => $this->section ? [
                'id' => $this->section->id,
                'name' => $this->section->name,
            ] : null),
            'marker' => $this->whenLoaded('markedBy', fn () => $this->markedBy ? [
                'id' => $this->markedBy->id,
                'name' => $this->markedBy->name,
                'email' => $this->markedBy->email,
            ] : null),
            'summary' => [
                'total' => (int) ($this->records_count ?? $this->records->count()),
                'present' => (int) ($this->present_count ?? $this->records->where('status', 'present')->count()),
                'absent' => (int) ($this->absent_count ?? $this->records->where('status', 'absent')->count()),
                'late' => (int) ($this->late_count ?? $this->records->where('status', 'late')->count()),
                'half_day' => (int) ($this->half_day_count ?? $this->records->where('status', 'half_day')->count()),
                'excused' => (int) ($this->excused_count ?? $this->records->where('status', 'excused')->count()),
            ],
            'records' => AttendanceRecordResource::collection($this->whenLoaded('records')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

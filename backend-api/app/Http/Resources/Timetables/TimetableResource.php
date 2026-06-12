<?php

namespace App\Http\Resources\Timetables;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimetableResource extends JsonResource
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
            'status' => $this->status,
            'published_at' => $this->published_at?->toISOString(),
            'academic_session' => $this->whenLoaded('academicSession', fn () => $this->academicSession ? [
                'id' => $this->academicSession->id,
                'name' => $this->academicSession->name,
            ] : null),
            'school_class' => $this->whenLoaded('schoolClass', fn () => $this->schoolClass ? [
                'id' => $this->schoolClass->id,
                'name' => $this->schoolClass->name,
            ] : null),
            'section' => $this->whenLoaded('section', fn () => $this->section ? [
                'id' => $this->section->id,
                'name' => $this->section->name,
            ] : null),
            'entries' => TimetableEntryResource::collection($this->whenLoaded('entries')),
            'entries_count' => (int) ($this->entries_count ?? 0),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

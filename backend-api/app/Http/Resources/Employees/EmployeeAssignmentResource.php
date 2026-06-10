<?php

namespace App\Http\Resources\Employees;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeAssignmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'class_id' => $this->class_id,
            'section_id' => $this->section_id,
            'subject_id' => $this->subject_id,
            'assignment_type' => $this->assignment_type,
            'status' => $this->status,
            'class' => $this->whenLoaded('schoolClass', fn () => [
                'id' => $this->schoolClass->id,
                'name' => $this->schoolClass->name,
            ]),
            'section' => $this->whenLoaded('section', fn () => $this->section ? [
                'id' => $this->section->id,
                'name' => $this->section->name,
            ] : null),
            'subject' => $this->whenLoaded('subject', fn () => $this->subject ? [
                'id' => $this->subject->id,
                'name' => $this->subject->name,
                'code' => $this->subject->code,
            ] : null),
        ];
    }
}

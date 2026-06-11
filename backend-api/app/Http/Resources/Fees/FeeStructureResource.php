<?php

namespace App\Http\Resources\Fees;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeStructureResource extends JsonResource
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
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'academic_session' => $this->whenLoaded('academicSession', fn () => $this->academicSession ? [
                'id' => $this->academicSession->id,
                'name' => $this->academicSession->name,
            ] : null),
            'class' => $this->whenLoaded('schoolClass', fn () => $this->schoolClass ? [
                'id' => $this->schoolClass->id,
                'name' => $this->schoolClass->name,
            ] : null),
            'items' => FeeStructureItemResource::collection($this->whenLoaded('items')),
            'items_count' => $this->whenCounted('items'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

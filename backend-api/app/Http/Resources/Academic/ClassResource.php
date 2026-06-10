<?php

namespace App\Http\Resources\Academic;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'sequence' => $this->sequence,
            'status' => $this->status,
            'sections' => SectionResource::collection($this->whenLoaded('sections')),
            'subjects' => $this->whenLoaded('subjects', fn () => $this->subjects->map(fn ($subject) => [
                'id' => $subject->id,
                'name' => $subject->name,
            ])),
        ];
    }
}

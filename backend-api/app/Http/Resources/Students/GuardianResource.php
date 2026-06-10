<?php

namespace App\Http\Resources\Students;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuardianResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'relation' => $this->relation,
            'phone' => $this->phone,
            'alternate_phone' => $this->alternate_phone,
            'email' => $this->email,
            'occupation' => $this->occupation,
            'address' => $this->address,
            'status' => $this->status,
            'relationship' => $this->whenPivotLoaded('guardian_student', fn () => $this->pivot->relationship),
            'is_primary' => $this->whenPivotLoaded('guardian_student', fn () => (bool) $this->pivot->is_primary),
            'is_emergency_contact' => $this->whenPivotLoaded('guardian_student', fn () => (bool) $this->pivot->is_emergency_contact),
            'pickup_allowed' => $this->whenPivotLoaded('guardian_student', fn () => (bool) $this->pivot->pickup_allowed),
        ];
    }
}

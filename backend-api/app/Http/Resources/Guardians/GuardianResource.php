<?php

namespace App\Http\Resources\Guardians;

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
            'portal' => $this->whenLoaded('user', fn () => $this->user ? [
                'has_login' => true,
                'enabled' => $this->user->status === 'active',
                'user_id' => $this->user->id,
                'email' => $this->user->email,
                'role' => $this->user->role,
                'status' => $this->user->status,
            ] : [
                'has_login' => false,
                'enabled' => false,
                'user_id' => null,
                'email' => null,
                'role' => null,
                'status' => null,
            ]),
            'students' => $this->whenLoaded('students', fn () => $this->students->map(fn ($student) => [
                'id' => $student->id,
                'admission_no' => $student->admission_no,
                'full_name' => $student->full_name,
                'class_name' => $student->class_name,
                'section' => $student->section,
                'roll_no' => $student->roll_no,
                'status' => $student->status,
                'relationship' => $student->pivot->relationship,
                'is_primary' => (bool) $student->pivot->is_primary,
                'is_emergency_contact' => (bool) $student->pivot->is_emergency_contact,
                'pickup_allowed' => (bool) $student->pivot->pickup_allowed,
            ])),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

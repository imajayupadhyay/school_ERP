<?php

namespace App\Http\Resources\Employees;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_code' => $this->employee_code,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'employee_type' => $this->employee_type,
            'designation' => $this->designation,
            'department' => $this->department,
            'employment_type' => $this->employment_type,
            'joining_date' => $this->joining_date?->toDateString(),
            'qualification' => $this->qualification,
            'experience_years' => $this->experience_years,
            'email' => $this->email,
            'phone' => $this->phone,
            'alternate_phone' => $this->alternate_phone,
            'address' => $this->address,
            'emergency_contact_name' => $this->emergency_contact_name,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'status' => $this->status,
            'login' => $this->whenLoaded('user', fn () => $this->user ? [
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
            'assignments' => EmployeeAssignmentResource::collection($this->whenLoaded('assignments')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

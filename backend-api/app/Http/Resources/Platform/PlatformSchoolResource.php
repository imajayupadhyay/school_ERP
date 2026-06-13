<?php

namespace App\Http\Resources\Platform;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin \App\Models\School */
class PlatformSchoolResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'status' => $this->status,

            // Contact
            'email' => $this->email,
            'phone' => $this->phone,
            'alternate_phone' => $this->alternate_phone,
            'website' => $this->website,

            // Address
            'address' => $this->address,
            'address_line2' => $this->address_line2,
            'city' => $this->city,
            'state' => $this->state,
            'postal_code' => $this->postal_code,
            'country' => $this->country,

            // Localization & academic year
            'timezone' => $this->timezone,
            'date_format' => $this->date_format,
            'currency' => $this->currency,
            'academic_year_start_month' => $this->academic_year_start_month,

            // Identifiers
            'board_affiliation' => $this->board_affiliation,
            'registration_number' => $this->registration_number,
            'udise_code' => $this->udise_code,
            'principal_name' => $this->principal_name,
            'established_year' => $this->established_year,

            // Branding
            'logo_path' => $this->logo_path,
            'logo_url' => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null,

            // Aggregates (present when loaded with withCount)
            'students_count' => $this->whenCounted('students'),
            'employees_count' => $this->whenCounted('employees'),
            'users_count' => $this->whenCounted('users'),

            // Owner/admin accounts (present when the users relation is loaded)
            'admins' => $this->whenLoaded('users', fn () => $this->users->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'role' => $u->role,
                'role_label' => ucwords(str_replace('_', ' ', (string) $u->role)),
                'status' => $u->status,
            ])->values()),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

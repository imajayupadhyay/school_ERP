<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin \App\Models\School */
class SchoolProfileResource extends JsonResource
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
        ];
    }
}

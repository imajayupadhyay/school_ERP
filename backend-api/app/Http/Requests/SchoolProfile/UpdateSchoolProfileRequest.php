<?php

namespace App\Http\Requests\SchoolProfile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSchoolProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && in_array($user->role, ['school_admin', 'principal', 'super_admin'], true);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],

            // Contact
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'alternate_phone' => ['nullable', 'string', 'max:20'],
            'website' => ['nullable', 'string', 'max:255'],

            // Address
            'address' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:100'],

            // Localization & academic year
            'timezone' => ['nullable', 'string', 'max:64'],
            'date_format' => ['nullable', 'string', 'max:20'],
            'currency' => ['nullable', 'string', 'max:10'],
            'academic_year_start_month' => ['nullable', 'integer', 'between:1,12'],

            // Identifiers
            'board_affiliation' => ['nullable', 'string', 'max:100'],
            'registration_number' => ['nullable', 'string', 'max:100'],
            'udise_code' => ['nullable', 'string', 'max:100'],
            'principal_name' => ['nullable', 'string', 'max:255'],
            'established_year' => ['nullable', 'integer', 'min:1800', 'max:'.(int) date('Y')],
        ];
    }
}

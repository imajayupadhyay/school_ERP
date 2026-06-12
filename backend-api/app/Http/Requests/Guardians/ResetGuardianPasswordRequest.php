<?php

namespace App\Http\Requests\Guardians;

use Illuminate\Foundation\Http\FormRequest;

class ResetGuardianPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'password' => ['required', 'string', 'min:8', 'max:100'],
        ];
    }
}

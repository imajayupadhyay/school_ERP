<?php

namespace App\Http\Requests\Guardians;

use App\Models\Guardian;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class GuardianRequest extends FormRequest
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
        $guardian = $this->route('guardian');
        $guardian = $guardian instanceof Guardian ? $guardian : null;
        $schoolId = $this->user()->school_id ?? $guardian?->school_id;

        return [
            'name' => ['required', 'string', 'max:120'],
            'relation' => ['nullable', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:30'],
            'alternate_phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'occupation' => ['nullable', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', 'in:active,inactive'],
            'portal_enabled' => ['sometimes', 'boolean'],
            'portal_email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'email')
                    ->where('school_id', $schoolId)
                    ->ignore($guardian?->user_id),
            ],
            'portal_password' => ['nullable', 'string', 'min:8', 'max:100'],
            'portal_status' => ['nullable', 'in:active,inactive,suspended'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $guardian = $this->route('guardian');
                $guardian = $guardian instanceof Guardian ? $guardian : null;

                if (! $this->boolean('portal_enabled')) {
                    return;
                }

                $portalEmail = $this->input('portal_email') ?: $this->input('email');

                if (! $portalEmail) {
                    $validator->errors()->add('portal_email', 'An email address is required when parent portal access is enabled.');
                }

                if (($this->isMethod('post') || $guardian?->user_id === null) && ! $this->input('portal_password')) {
                    $validator->errors()->add('portal_password', 'A password is required when creating parent portal access.');
                }
            },
        ];
    }
}

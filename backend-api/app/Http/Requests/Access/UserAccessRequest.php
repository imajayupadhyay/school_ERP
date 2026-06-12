<?php

namespace App\Http\Requests\Access;

use App\Support\PermissionRegistry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Update a user's role and/or per-user permission overrides. Authorization is
 * enforced by the permission:access.manage route middleware; tenant + target
 * guards are enforced in the controller.
 */
class UserAccessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $schoolId = $this->user()->school_id;

        return [
            'role_id' => [
                'sometimes', 'integer',
                Rule::exists('roles', 'id')->where('school_id', $schoolId),
            ],
            'overrides' => ['sometimes', 'array'],
            'overrides.*.key' => ['required', 'string', Rule::in(PermissionRegistry::keys())],
            'overrides.*.granted' => ['required', 'boolean'],
        ];
    }
}

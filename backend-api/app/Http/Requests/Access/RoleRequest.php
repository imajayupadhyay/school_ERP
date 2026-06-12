<?php

namespace App\Http\Requests\Access;

use App\Models\Role;
use App\Support\PermissionRegistry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Create/update a role. Authorization is enforced by the permission:access.manage
 * route middleware.
 */
class RoleRequest extends FormRequest
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
        /** @var Role|null $role */
        $role = $this->route('role');
        $schoolId = $this->user()->school_id;

        return [
            'name' => [
                'required', 'string', 'max:80',
                Rule::unique('roles', 'name')
                    ->where('school_id', $schoolId)
                    ->ignore($role?->id),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::in(PermissionRegistry::keys())],
        ];
    }
}

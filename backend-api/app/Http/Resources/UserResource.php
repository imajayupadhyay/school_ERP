<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role,
            'role_id' => $this->role_id,
            'role_label' => $this->roleModel?->name ?? $this->defaultRoleLabel(),
            'is_owner' => $this->isOwner(),
            'permissions' => $this->effectivePermissions(),
            'status' => $this->status,
            'school_id' => $this->school_id,
            'school' => new SchoolResource($this->whenLoaded('school')),
        ];
    }

    /** Fallback label for users without a role row (e.g. platform super admin). */
    private function defaultRoleLabel(): string
    {
        return ucwords(str_replace('_', ' ', (string) $this->role));
    }
}

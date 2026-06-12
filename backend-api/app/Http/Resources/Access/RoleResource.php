<?php

namespace App\Http\Resources\Access;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Role */
class RoleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $keys = $this->permissionKeys();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'is_system' => $this->is_system,
            'is_owner' => $this->is_owner,
            'is_protected' => $this->is_protected,
            'permissions' => $keys,
            'permissions_count' => count($keys),
            'users_count' => $this->whenCounted('users'),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}

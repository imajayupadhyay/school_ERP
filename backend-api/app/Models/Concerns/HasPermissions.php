<?php

namespace App\Models\Concerns;

use App\Models\Permission;
use App\Models\Role;
use App\Models\UserPermission;
use App\Support\PermissionRegistry;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Mixed into User. Resolves effective permissions as:
 *   role permissions ∪ per-user grants − per-user revokes
 *
 * Platform super admins and owner-role users resolve to all permissions.
 */
trait HasPermissions
{
    /** Request-level cache of the resolved permission key set. */
    private ?array $effectivePermissionCache = null;

    /** @return BelongsTo<Role, $this> */
    public function roleModel(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    /** @return HasMany<UserPermission, $this> */
    public function permissionOverrides(): HasMany
    {
        return $this->hasMany(UserPermission::class);
    }

    /** Platform owner — bypasses all permission checks for any school. */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    /** Belongs to an owner role (school_admin/principal) with full school access. */
    public function isOwner(): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->roleModel?->is_owner) {
            return true;
        }

        // Backward-compat: recognise owner role strings even without a role_id.
        return in_array($this->role, PermissionRegistry::ownerSlugs(), true);
    }

    /**
     * Effective permission keys for this user.
     *
     * @return array<int, string>
     */
    public function effectivePermissions(): array
    {
        if ($this->effectivePermissionCache !== null) {
            return $this->effectivePermissionCache;
        }

        if ($this->isOwner()) {
            return $this->effectivePermissionCache = ['*'];
        }

        // role_id is authoritative; fall back to the legacy role string's
        // template so users provisioned before backfill still resolve.
        if ($this->roleModel !== null) {
            $keys = $this->roleModel->permissionKeys();
        } else {
            $keys = PermissionRegistry::templateKeys((string) $this->role);
        }

        $keys = array_flip($keys);

        // Apply per-user grants/revokes.
        $overrides = $this->relationLoaded('permissionOverrides')
            ? $this->permissionOverrides
            : $this->permissionOverrides()->with('permission')->get();

        foreach ($overrides as $override) {
            $key = $override->permission?->key ?? $this->permissionKeyById($override->permission_id);

            if ($key === null) {
                continue;
            }

            if ($override->granted) {
                $keys[$key] = true;
            } else {
                unset($keys[$key]);
            }
        }

        return $this->effectivePermissionCache = array_keys($keys);
    }

    public function hasPermission(string $key): bool
    {
        $keys = $this->effectivePermissions();

        return in_array('*', $keys, true) || in_array($key, $keys, true);
    }

    /** Clear the request cache after role/override changes within one request. */
    public function forgetPermissionCache(): void
    {
        $this->effectivePermissionCache = null;
    }

    private function permissionKeyById(int $id): ?string
    {
        return Permission::query()->whereKey($id)->value('key');
    }
}

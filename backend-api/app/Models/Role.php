<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use App\Support\PermissionRegistry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Tenant-scoped role: seeded system roles + admin-created custom roles.
 */
class Role extends Model
{
    use BelongsToSchool;

    protected $fillable = [
        'school_id',
        'name',
        'slug',
        'description',
        'is_system',
        'is_owner',
        'is_protected',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'is_owner' => 'boolean',
            'is_protected' => 'boolean',
        ];
    }

    /** @return BelongsToMany<Permission, $this> */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions');
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Permission keys this role grants. Owner roles implicitly grant everything.
     *
     * @return array<int, string>
     */
    public function permissionKeys(): array
    {
        if ($this->is_owner) {
            return PermissionRegistry::keys();
        }

        return $this->permissions->pluck('key')->all();
    }
}

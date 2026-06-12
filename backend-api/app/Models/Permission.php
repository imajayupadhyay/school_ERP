<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Global permission catalog (not tenant-scoped). Seeded from
 * config/permissions.php via PermissionSeeder.
 */
class Permission extends Model
{
    protected $fillable = [
        'key',
        'module',
        'action',
        'label',
        'group',
        'is_special',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_special' => 'boolean',
        ];
    }

    /** @return BelongsToMany<Role, $this> */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions');
    }
}

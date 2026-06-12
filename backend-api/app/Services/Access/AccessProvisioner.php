<?php

namespace App\Services\Access;

use App\Models\Permission;
use App\Models\Role;
use App\Models\School;
use App\Models\User;
use App\Support\PermissionRegistry;
use Illuminate\Support\Facades\DB;

/**
 * Provisions RBAC data from the permission registry: the global permission
 * catalog, a school's default system roles, and backfilling user role_id.
 * Reusable from seeders and from school-creation flows.
 */
class AccessProvisioner
{
    /** Upsert the global permission catalog from config/permissions.php. */
    public function syncCatalog(): void
    {
        foreach (PermissionRegistry::catalog() as $entry) {
            Permission::updateOrCreate(
                ['key' => $entry['key']],
                [
                    'module' => $entry['module'],
                    'action' => $entry['action'],
                    'label' => $entry['label'],
                    'group' => $entry['group'],
                    'is_special' => $entry['is_special'],
                    'sort_order' => $entry['sort_order'],
                ],
            );
        }
    }

    /**
     * Create/update the default system roles for a school and attach their
     * permissions. Idempotent. Owner roles are not given pivot rows (they
     * resolve to every permission dynamically).
     */
    public function provisionSchool(School $school): void
    {
        $permissionIds = Permission::pluck('id', 'key');
        $sort = 0;

        foreach (PermissionRegistry::roleTemplates() as $slug => $template) {
            $role = Role::withoutGlobalScope('school')->updateOrCreate(
                ['school_id' => $school->id, 'slug' => $slug],
                [
                    'name' => $template['name'],
                    'description' => $template['description'] ?? null,
                    'is_system' => true,
                    'is_owner' => (bool) ($template['is_owner'] ?? false),
                    'is_protected' => (bool) ($template['is_protected'] ?? false),
                    'sort_order' => $sort++,
                ],
            );

            if ($role->is_owner) {
                continue;
            }

            $keys = PermissionRegistry::expand($template['permissions'] ?? []);
            $ids = $permissionIds->only($keys)->values()->all();
            $role->permissions()->sync($ids);
        }
    }

    /**
     * Backfill role_id on a school's users by matching the legacy `role`
     * string to a seeded role slug. Leaves super_admin/parent (no school
     * staff role) untouched where no matching slug exists.
     */
    public function backfillUsers(School $school): void
    {
        $roles = Role::withoutGlobalScope('school')
            ->where('school_id', $school->id)
            ->pluck('id', 'slug');

        User::where('school_id', $school->id)
            ->whereNull('role_id')
            ->get()
            ->each(function (User $user) use ($roles) {
                if (isset($roles[$user->role])) {
                    $user->update(['role_id' => $roles[$user->role]]);
                }
            });
    }

    /** Assign a role to a user, keeping the legacy role string in sync. */
    public function assignRole(User $user, Role $role): void
    {
        DB::transaction(function () use ($user, $role) {
            $user->update([
                'role_id' => $role->id,
                'role' => $role->slug,
            ]);
        });
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Access;

use App\Http\Controllers\Controller;
use App\Http\Requests\Access\RoleRequest;
use App\Http\Resources\Access\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')
            ->withCount('users')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return $this->ok(RoleResource::collection($roles));
    }

    public function show(Role $role): JsonResponse
    {
        return $this->ok(new RoleResource($role->load('permissions')->loadCount('users')));
    }

    public function store(RoleRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $role = Role::create([
            'name' => $validated['name'],
            'slug' => $this->uniqueSlug($request->user()->school_id, $validated['name']),
            'description' => $validated['description'] ?? null,
            'is_system' => false,
            'is_owner' => false,
            'is_protected' => false,
            'sort_order' => 100,
        ]);

        $this->syncPermissions($role, $validated['permissions'] ?? []);

        $this->auditLogger->log(
            school: $role->school,
            user: $request->user(),
            action: 'role.created',
            changes: ['name' => $role->name, 'permissions' => $role->permissionKeys()],
            auditable: $role,
            ipAddress: $request->ip(),
        );

        return $this->created(
            new RoleResource($role->load('permissions')->loadCount('users')),
            'Role created.',
        );
    }

    public function update(RoleRequest $request, Role $role): JsonResponse
    {
        $validated = $request->validated();
        $original = ['name' => $role->name, 'description' => $role->description, 'permissions' => $role->permissionKeys()];

        $role->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        // Owner roles always grant everything — their matrix is locked.
        if (! $role->is_owner && array_key_exists('permissions', $validated)) {
            $this->syncPermissions($role, $validated['permissions']);
        }

        $role->load('permissions');
        $changes = $this->auditLogger->diff($original, [
            'name' => $role->name,
            'description' => $role->description,
            'permissions' => $role->permissionKeys(),
        ]);

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $role->school,
                user: $request->user(),
                action: 'role.updated',
                changes: $changes,
                auditable: $role,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(
            new RoleResource($role->loadCount('users')),
            'Role updated.',
        );
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        if ($role->is_protected || $role->is_system) {
            return $this->fail('System roles cannot be deleted.', 422);
        }

        if ($role->users()->exists()) {
            return $this->fail('Reassign the members of this role before deleting it.', 422);
        }

        $role->permissions()->detach();
        $role->delete();

        $this->auditLogger->log(
            school: $role->school,
            user: $request->user(),
            action: 'role.deleted',
            changes: ['name' => $role->name],
            auditable: $role,
            ipAddress: $request->ip(),
        );

        return $this->ok(null, 'Role deleted.');
    }

    /**
     * @param  array<int, string>  $keys
     */
    private function syncPermissions(Role $role, array $keys): void
    {
        $ids = Permission::whereIn('key', $keys)->pluck('id')->all();
        $role->permissions()->sync($ids);
    }

    private function uniqueSlug(int $schoolId, string $name): string
    {
        $base = Str::slug($name, '_') ?: 'role';
        $slug = $base;
        $i = 2;

        while (Role::where('school_id', $schoolId)->where('slug', $slug)->exists()) {
            $slug = "{$base}_{$i}";
            $i++;
        }

        return $slug;
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Access;

use App\Http\Controllers\Controller;
use App\Http\Requests\Access\UserAccessRequest;
use App\Http\Resources\Access\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserAccessController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    /** Role + effective permissions + per-user overrides for one user. */
    public function show(Request $request, User $user): JsonResponse
    {
        if ($guard = $this->guardTarget($request, $user)) {
            return $guard;
        }

        return $this->ok($this->accessPayload($user));
    }

    /** Update a user's role and/or replace their permission overrides. */
    public function update(UserAccessRequest $request, User $user): JsonResponse
    {
        if ($guard = $this->guardTarget($request, $user)) {
            return $guard;
        }

        $validated = $request->validated();
        $changes = [];

        DB::transaction(function () use ($request, $user, $validated, &$changes) {
            if (array_key_exists('role_id', $validated)) {
                $role = Role::findOrFail($validated['role_id']);

                if ($user->role_id !== $role->id) {
                    $changes['role'] = ['old' => $user->role, 'new' => $role->slug];
                    $user->update(['role_id' => $role->id, 'role' => $role->slug]);
                }
            }

            if (array_key_exists('overrides', $validated)) {
                $changes['overrides'] = ['old' => $this->overrideList($user)];
                $this->replaceOverrides($user, $validated['overrides']);
                $changes['overrides']['new'] = $this->overrideList($user->fresh());
            }
        });

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $user->school,
                user: $request->user(),
                action: 'user.access_updated',
                changes: $changes,
                auditable: $user,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok($this->accessPayload($user->fresh()), 'Access updated.');
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        if ($guard = $this->guardTarget($request, $user)) {
            return $guard;
        }

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'max:72'],
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
            'status' => 'active',
        ]);

        $this->auditLogger->log(
            school: $user->school,
            user: $request->user(),
            action: 'user.password_reset',
            changes: ['status' => 'active'],
            auditable: $user,
            ipAddress: $request->ip(),
        );

        return $this->ok(null, 'Password reset.');
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        if ($guard = $this->guardTarget($request, $user)) {
            return $guard;
        }

        if ($user->id === $request->user()->id) {
            return $this->fail('You cannot change your own login status.', 422);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        if ($user->status === $validated['status']) {
            return $this->ok($this->accessPayload($user), 'No change.');
        }

        $old = $user->status;
        $user->update(['status' => $validated['status']]);

        // Keep the linked employee record's status aligned.
        $user->employee?->update(['status' => $validated['status']]);

        $this->auditLogger->log(
            school: $user->school,
            user: $request->user(),
            action: 'user.status_updated',
            changes: ['status' => ['old' => $old, 'new' => $validated['status']]],
            auditable: $user,
            ipAddress: $request->ip(),
        );

        return $this->ok($this->accessPayload($user->fresh()), 'Login status updated.');
    }

    /**
     * Tenant + target guard. Returns an error response when the target may not
     * be managed by the current actor, otherwise null.
     */
    private function guardTarget(Request $request, User $user): ?JsonResponse
    {
        $actor = $request->user();

        // Tenant isolation: route binding is not school-scoped for User.
        if (! $actor->isSuperAdmin() && $user->school_id !== $actor->school_id) {
            return $this->fail('User not found.', 404);
        }

        if ($user->isSuperAdmin()) {
            return $this->fail('Platform administrators cannot be managed here.', 403);
        }

        if ($user->isOwner() && $user->id !== $actor->id && ! $actor->isOwner()) {
            return $this->fail('You cannot manage an owner account.', 403);
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function accessPayload(User $user): array
    {
        $user->loadMissing('roleModel.permissions', 'permissionOverrides.permission');
        $role = $user->roleModel;

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'role' => $user->role,
                'role_id' => $user->role_id,
            ],
            'role' => $role ? new RoleResource($role) : null,
            'is_owner' => $user->isOwner(),
            'role_permissions' => $role?->permissionKeys() ?? [],
            'effective_permissions' => $user->effectivePermissions(),
            'overrides' => $this->overrideList($user),
        ];
    }

    /**
     * @return array<int, array{key: string, granted: bool}>
     */
    private function overrideList(User $user): array
    {
        return $user->permissionOverrides()
            ->with('permission')
            ->get()
            ->map(fn ($o) => ['key' => $o->permission?->key, 'granted' => $o->granted])
            ->filter(fn ($o) => $o['key'] !== null)
            ->values()
            ->all();
    }

    /**
     * Replace all per-user overrides with the given list.
     *
     * @param  array<int, array{key: string, granted: bool}>  $overrides
     */
    private function replaceOverrides(User $user, array $overrides): void
    {
        $user->permissionOverrides()->delete();

        $permissionIds = Permission::pluck('id', 'key');

        foreach ($overrides as $override) {
            $permissionId = $permissionIds[$override['key']] ?? null;

            if ($permissionId === null) {
                continue;
            }

            $user->permissionOverrides()->create([
                'school_id' => $user->school_id,
                'permission_id' => $permissionId,
                'granted' => (bool) $override['granted'],
            ]);
        }
    }
}

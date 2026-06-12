<?php

namespace Tests\Feature\Access;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\School;
use App\Models\User;
use App\Services\Access\AccessProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    private AccessProvisioner $provisioner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->provisioner = app(AccessProvisioner::class);
        $this->provisioner->syncCatalog();
    }

    private function makeSchool(string $code = 'Demo'): School
    {
        $school = School::create(['name' => "{$code} School", 'code' => $code]);
        $this->provisioner->provisionSchool($school);

        return $school;
    }

    private function makeUser(School $school, string $role): User
    {
        $user = User::factory()->create([
            'school_id' => $school->id,
            'role' => $role,
            'password' => Hash::make('Password@123'),
        ]);
        $this->provisioner->backfillUsers($school);

        return $user->fresh();
    }

    public function test_catalog_is_seeded_and_returned_grouped(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $this->assertGreaterThan(0, Permission::count());

        $this->actingAs($admin)->getJson('/api/v1/access/permissions')
            ->assertOk()
            ->assertJsonStructure(['data' => ['groups', 'keys']])
            ->assertJsonFragment(['key' => 'students.update']);
    }

    public function test_admin_login_payload_carries_effective_permissions(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $this->actingAs($admin)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.is_owner', true)
            ->assertJsonPath('data.permissions', ['*']);
    }

    public function test_owner_role_always_has_full_access(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $this->assertTrue($admin->isOwner());
        $this->assertTrue($admin->hasPermission('students.delete'));
        $this->assertTrue($admin->hasPermission('access.manage'));
    }

    public function test_create_custom_role_and_sync_permissions(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/access/roles', [
            'name' => 'Front Office',
            'description' => 'Reception desk',
            'permissions' => ['dashboard.view', 'students.view', 'students.create'],
        ])->assertCreated();

        $roleId = $response->json('data.id');
        $this->assertDatabaseHas('roles', ['id' => $roleId, 'name' => 'Front Office', 'is_system' => false]);
        $this->assertEqualsCanonicalizing(
            ['dashboard.view', 'students.view', 'students.create'],
            $response->json('data.permissions'),
        );

        // Update narrows the permission set.
        $this->actingAs($admin)->putJson("/api/v1/access/roles/{$roleId}", [
            'name' => 'Front Office',
            'permissions' => ['dashboard.view'],
        ])->assertOk()->assertJsonPath('data.permissions', ['dashboard.view']);

        $this->assertDatabaseHas('audit_logs', ['action' => 'role.created']);
    }

    public function test_assigning_a_role_changes_effective_permissions(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $staff = $this->makeUser($school, 'staff');

        $this->assertFalse($staff->hasPermission('students.view'));

        $accountant = Role::where('school_id', $school->id)->where('slug', 'accountant')->firstOrFail();

        $this->actingAs($admin)->putJson("/api/v1/access/users/{$staff->id}", [
            'role_id' => $accountant->id,
        ])->assertOk()->assertJsonPath('data.user.role', 'accountant');

        $staff->refresh()->forgetPermissionCache();
        $this->assertTrue($staff->hasPermission('fees.collect'));
    }

    public function test_per_user_override_grants_and_revokes(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $teacher = $this->makeUser($school, 'teacher');

        // Teacher cannot create students by default, and can delete learning.
        $this->actingAs($teacher)->postJson('/api/v1/students', [])->assertStatus(403);

        $this->actingAs($admin)->putJson("/api/v1/access/users/{$teacher->id}", [
            'overrides' => [
                ['key' => 'students.create', 'granted' => true],
                ['key' => 'learning.delete', 'granted' => false],
            ],
        ])->assertOk();

        $teacher->refresh()->forgetPermissionCache();
        $this->assertTrue($teacher->hasPermission('students.create'));
        $this->assertFalse($teacher->hasPermission('learning.delete'));

        // The grant is now honoured by the middleware (422 = passed the guard,
        // failed validation, not 403).
        $this->actingAs($teacher)->postJson('/api/v1/students', [])->assertStatus(422);
    }

    public function test_middleware_blocks_unauthorised_writes(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');

        // Teacher has students.view but not students.create.
        $this->actingAs($teacher)->getJson('/api/v1/students')->assertOk();
        $this->actingAs($teacher)->postJson('/api/v1/students', [])->assertStatus(403);
    }

    public function test_admin_can_reset_password_and_toggle_status(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $teacher = $this->makeUser($school, 'teacher');

        $this->actingAs($admin)->postJson("/api/v1/access/users/{$teacher->id}/reset-password", [
            'password' => 'BrandNew@123',
        ])->assertOk();

        $this->assertTrue(Hash::check('BrandNew@123', $teacher->fresh()->password));

        $this->actingAs($admin)->putJson("/api/v1/access/users/{$teacher->id}/status", [
            'status' => 'inactive',
        ])->assertOk();

        $this->assertSame('inactive', $teacher->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.status_updated']);
    }

    public function test_protected_system_role_cannot_be_deleted(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $teacherRole = Role::where('school_id', $school->id)->where('slug', 'teacher')->firstOrFail();

        $this->actingAs($admin)->deleteJson("/api/v1/access/roles/{$teacherRole->id}")
            ->assertStatus(422);
    }

    public function test_role_with_members_cannot_be_deleted(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $roleId = $this->actingAs($admin)->postJson('/api/v1/access/roles', [
            'name' => 'Lab Assistant',
            'permissions' => ['dashboard.view'],
        ])->json('data.id');

        $member = $this->makeUser($school, 'staff');
        $member->update(['role_id' => $roleId]);

        $this->actingAs($admin)->deleteJson("/api/v1/access/roles/{$roleId}")
            ->assertStatus(422);
    }

    public function test_non_managers_cannot_access_rbac(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');

        $this->actingAs($teacher)->getJson('/api/v1/access/roles')->assertStatus(403);
        $this->actingAs($teacher)->postJson('/api/v1/access/roles', ['name' => 'X'])->assertStatus(403);
    }

    public function test_tenant_isolation_blocks_cross_school_user_access(): void
    {
        $schoolA = $this->makeSchool('AAA');
        $schoolB = $this->makeSchool('BBB');
        $adminA = $this->makeUser($schoolA, 'school_admin');
        $teacherB = $this->makeUser($schoolB, 'teacher');

        // Admin of school A cannot manage a user in school B.
        $this->actingAs($adminA)->getJson("/api/v1/access/users/{$teacherB->id}")
            ->assertStatus(404);
    }
}

<?php

namespace Tests\Feature\Platform;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformSchoolManagementTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        return User::factory()->create([
            'school_id' => null,
            'name' => 'Platform Owner',
            'email' => 'owner@schoollid.test',
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    public function test_super_admin_can_create_a_school_with_an_owner_admin(): void
    {
        $admin = $this->superAdmin();

        $response = $this->actingAs($admin)->postJson('/api/v1/platform/schools', [
            'name' => 'Green Valley High',
            'code' => 'GVH',
            'city' => 'Pune',
            'admin_name' => 'Riya Sharma',
            'admin_email' => 'riya@gvh.test',
            'admin_password' => 'Owner@123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.school.name', 'Green Valley High')
            ->assertJsonPath('data.school.code', 'GVH')
            ->assertJsonPath('data.admin.email', 'riya@gvh.test')
            ->assertJsonPath('data.temporary_password', null); // supplied, so not generated

        $school = School::where('code', 'GVH')->firstOrFail();

        // Default RBAC roles provisioned, including the owner school_admin role.
        $ownerRole = Role::withoutGlobalScope('school')
            ->where('school_id', $school->id)
            ->where('slug', 'school_admin')
            ->first();
        $this->assertNotNull($ownerRole);
        $this->assertTrue((bool) $ownerRole->is_owner);

        $owner = User::where('school_id', $school->id)->where('email', 'riya@gvh.test')->firstOrFail();
        $this->assertSame('school_admin', $owner->role);
        $this->assertSame($ownerRole->id, $owner->role_id);

        $this->assertDatabaseHas('audit_logs', [
            'school_id' => $school->id,
            'action' => 'school.created',
        ]);
    }

    public function test_created_owner_admin_can_log_in_to_their_school(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)->postJson('/api/v1/platform/schools', [
            'name' => 'Sunrise Academy',
            'code' => 'SUN',
            'admin_name' => 'Owner One',
            'admin_email' => 'owner@sun.test',
            'admin_password' => 'Owner@123',
        ])->assertCreated();

        // The freshly provisioned owner logs into the school panel end-to-end.
        $login = $this->postJson('/api/v1/auth/login', [
            'school_code' => 'SUN',
            'email' => 'owner@sun.test',
            'password' => 'Owner@123',
        ]);

        $login->assertOk()
            ->assertJsonPath('data.user.is_owner', true)
            ->assertJsonPath('data.user.permissions.0', '*');
    }

    public function test_create_generates_a_temporary_password_when_none_given(): void
    {
        $admin = $this->superAdmin();

        $response = $this->actingAs($admin)->postJson('/api/v1/platform/schools', [
            'name' => 'No Password School',
            'admin_name' => 'Admin',
            'admin_email' => 'a@nps.test',
        ]);

        $response->assertCreated();
        $this->assertNotNull($response->json('data.temporary_password'));
        $this->assertNotEmpty($response->json('data.school.code')); // auto-generated
    }

    public function test_duplicate_school_code_is_rejected(): void
    {
        $admin = $this->superAdmin();
        School::create(['name' => 'Existing', 'code' => 'DUP', 'status' => 'active']);

        $this->actingAs($admin)->postJson('/api/v1/platform/schools', [
            'name' => 'Another',
            'code' => 'DUP',
            'admin_name' => 'A',
            'admin_email' => 'a@another.test',
        ])->assertStatus(422)->assertJsonValidationErrors('code');
    }

    public function test_index_is_searchable_and_returns_counts(): void
    {
        $admin = $this->superAdmin();
        $alpha = School::create(['name' => 'Alpha School', 'code' => 'ALP', 'status' => 'active', 'city' => 'Delhi']);
        School::create(['name' => 'Beta School', 'code' => 'BET', 'status' => 'suspended', 'city' => 'Mumbai']);
        Student::create(['school_id' => $alpha->id, 'first_name' => 'S1']);
        Student::create(['school_id' => $alpha->id, 'first_name' => 'S2']);

        $all = $this->actingAs($admin)->getJson('/api/v1/platform/schools');
        $all->assertOk()->assertJsonPath('data.meta.total', 2);

        $filtered = $this->actingAs($admin)->getJson('/api/v1/platform/schools?search=Alpha');
        $filtered->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.items.0.code', 'ALP')
            ->assertJsonPath('data.items.0.students_count', 2);

        $byStatus = $this->actingAs($admin)->getJson('/api/v1/platform/schools?status=suspended');
        $byStatus->assertOk()->assertJsonPath('data.meta.total', 1);
    }

    public function test_update_and_status_change_are_audited(): void
    {
        $admin = $this->superAdmin();
        $school = School::create(['name' => 'Old Name', 'code' => 'OLD', 'status' => 'active']);

        $this->actingAs($admin)->putJson("/api/v1/platform/schools/{$school->id}", [
            'name' => 'New Name',
            'code' => 'OLD',
            'status' => 'active',
            'city' => 'Jaipur',
        ])->assertOk()->assertJsonPath('data.name', 'New Name');

        $this->assertDatabaseHas('audit_logs', ['school_id' => $school->id, 'action' => 'school.updated']);

        $this->actingAs($admin)->postJson("/api/v1/platform/schools/{$school->id}/status", [
            'status' => 'suspended',
        ])->assertOk()->assertJsonPath('data.status', 'suspended');

        $this->assertDatabaseHas('audit_logs', ['school_id' => $school->id, 'action' => 'school.status_changed']);
        $this->assertSame('suspended', $school->fresh()->status);
    }

    public function test_school_user_cannot_access_platform_school_endpoints(): void
    {
        $school = School::create(['name' => 'Tenant', 'code' => 'TEN', 'status' => 'active']);
        $user = User::factory()->create([
            'school_id' => $school->id,
            'role' => 'school_admin',
            'status' => 'active',
        ]);

        $this->actingAs($user)->getJson('/api/v1/platform/schools')->assertStatus(403);
        $this->actingAs($user)->postJson('/api/v1/platform/schools', [])->assertStatus(403);
    }
}

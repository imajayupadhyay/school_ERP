<?php

namespace Tests\Feature\Platform;

use App\Models\Employee;
use App\Models\Role;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Services\Platform\SchoolProvisioningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PlatformSchoolDeletionTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        return User::factory()->create([
            'school_id' => null,
            'email' => 'owner@schoollid.test',
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    /** Provision a school with roles, an owner, students and an employee. */
    private function seedSchool(string $name, string $code): School
    {
        /** @var SchoolProvisioningService $provisioner */
        $provisioner = app(SchoolProvisioningService::class);
        $result = $provisioner->createSchool(
            ['name' => $name, 'code' => $code, 'status' => 'active'],
            ['name' => "{$code} Owner", 'email' => "owner@{$code}.test", 'password' => 'Owner@123'],
            null,
            null,
        );
        $school = $result['school'];

        Student::create(['school_id' => $school->id, 'first_name' => "{$code} Student 1"]);
        Student::create(['school_id' => $school->id, 'first_name' => "{$code} Student 2"]);
        Employee::create([
            'school_id' => $school->id,
            'employee_code' => "{$code}-EMP-1",
            'first_name' => "{$code} Staff",
            'employee_type' => 'teaching',
            'status' => 'active',
        ]);

        return $school;
    }

    public function test_deleting_a_school_purges_all_its_data_and_leaves_others_intact(): void
    {
        $admin = $this->superAdmin();
        $alpha = $this->seedSchool('Alpha School', 'ALP');
        $beta = $this->seedSchool('Beta School', 'BET');

        $response = $this->actingAs($admin)->deleteJson("/api/v1/platform/schools/{$alpha->id}", [
            'confirm_code' => 'ALP',
        ]);

        $response->assertOk();

        // Alpha is completely gone across every tenant table.
        $this->assertDatabaseMissing('schools', ['id' => $alpha->id]);
        foreach (['users', 'students', 'employees', 'roles'] as $table) {
            $this->assertSame(0, DB::table($table)->where('school_id', $alpha->id)->count(), "$table not purged");
        }
        // role_permissions (no school_id) purged via Alpha's roles — none should reference a deleted role.
        $orphanPivots = DB::table('role_permissions')
            ->whereNotIn('role_id', DB::table('roles')->pluck('id'))
            ->count();
        $this->assertSame(0, $orphanPivots);

        // Beta is fully intact.
        $this->assertDatabaseHas('schools', ['id' => $beta->id]);
        $this->assertSame(2, DB::table('students')->where('school_id', $beta->id)->count());
        $this->assertSame(1, DB::table('employees')->where('school_id', $beta->id)->count());
        $this->assertGreaterThan(0, Role::withoutGlobalScope('school')->where('school_id', $beta->id)->count());

        // A platform-level audit record survives the purge (school_id null).
        $this->assertDatabaseHas('audit_logs', [
            'school_id' => null,
            'action' => 'school.deleted',
        ]);
    }

    public function test_delete_requires_matching_confirmation_code(): void
    {
        $admin = $this->superAdmin();
        $alpha = $this->seedSchool('Alpha School', 'ALP');

        $this->actingAs($admin)->deleteJson("/api/v1/platform/schools/{$alpha->id}", [
            'confirm_code' => 'WRONG',
        ])->assertStatus(422)->assertJsonValidationErrors('confirm_code');

        // Nothing was deleted.
        $this->assertDatabaseHas('schools', ['id' => $alpha->id]);
        $this->assertSame(2, DB::table('students')->where('school_id', $alpha->id)->count());
    }

    public function test_the_acting_super_admin_is_not_affected_by_a_school_delete(): void
    {
        $admin = $this->superAdmin();
        $alpha = $this->seedSchool('Alpha School', 'ALP');

        $this->actingAs($admin)->deleteJson("/api/v1/platform/schools/{$alpha->id}", [
            'confirm_code' => 'ALP',
        ])->assertOk();

        // The platform owner account still exists.
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'role' => 'super_admin']);
    }

    public function test_school_user_cannot_delete_a_school(): void
    {
        $alpha = $this->seedSchool('Alpha School', 'ALP');
        $user = User::factory()->create([
            'school_id' => $alpha->id,
            'role' => 'school_admin',
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/platform/schools/{$alpha->id}", ['confirm_code' => 'ALP'])
            ->assertStatus(403);

        $this->assertDatabaseHas('schools', ['id' => $alpha->id]);
    }
}

<?php

namespace Tests\Feature\Guardians;

use App\Models\AuditLog;
use App\Models\Guardian;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class GuardianManagementTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(string $code = 'Demo'): School
    {
        return School::create([
            'name' => "{$code} School",
            'code' => $code,
        ]);
    }

    private function makeUser(School $school, string $role): User
    {
        return User::factory()->create([
            'school_id' => $school->id,
            'role' => $role,
        ]);
    }

    private function makeStudent(School $school, array $overrides = []): Student
    {
        return Student::create(array_merge([
            'school_id' => $school->id,
            'admission_no' => 'ADM001',
            'first_name' => 'Aarav',
            'last_name' => 'Sharma',
            'status' => 'active',
        ], $overrides));
    }

    private function guardianPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ravi Sharma',
            'relation' => 'Father',
            'phone' => '+91 90000 00001',
            'alternate_phone' => '+91 90000 00002',
            'email' => 'ravi@example.test',
            'occupation' => 'Engineer',
            'address' => '12 Education Lane',
            'status' => 'active',
        ], $overrides);
    }

    public function test_admin_can_create_guardian_with_parent_portal_login_and_audit_log(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/guardians', $this->guardianPayload([
            'portal_enabled' => true,
            'portal_email' => 'parent@example.test',
            'portal_password' => 'Parent@123',
        ]));

        $response->assertCreated();
        $response->assertJsonPath('data.name', 'Ravi Sharma');
        $response->assertJsonPath('data.portal.email', 'parent@example.test');
        $response->assertJsonPath('data.portal.role', 'parent');

        $this->assertDatabaseHas('guardians', [
            'school_id' => $school->id,
            'name' => 'Ravi Sharma',
        ]);
        $this->assertDatabaseHas('users', [
            'school_id' => $school->id,
            'email' => 'parent@example.test',
            'role' => 'parent',
            'status' => 'active',
        ]);
        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'guardian.created')->first()
        );
    }

    public function test_guardian_list_is_tenant_scoped_searchable_and_restricted_to_admins(): void
    {
        $school = $this->makeSchool('A');
        $otherSchool = $this->makeSchool('B');
        $admin = $this->makeUser($school, 'school_admin');
        $teacher = $this->makeUser($school, 'teacher');

        Guardian::create($this->guardianPayload(['school_id' => $school->id]));
        Guardian::create($this->guardianPayload([
            'school_id' => $otherSchool->id,
            'name' => 'Hidden Parent',
            'email' => 'hidden@example.test',
        ]));

        $response = $this->actingAs($admin)->getJson('/api/v1/guardians?search=Ravi&per_page=5');

        $response->assertOk();
        $response->assertJsonPath('data.meta.total', 1);
        $response->assertJsonPath('data.items.0.name', 'Ravi Sharma');
        $response->assertJsonMissing(['name' => 'Hidden Parent']);

        $this->actingAs($teacher)->getJson('/api/v1/guardians')->assertStatus(403);
    }

    public function test_admin_can_sync_children_and_primary_guardian_updates_student_contact(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $student = $this->makeStudent($school);
        $otherGuardian = Guardian::create($this->guardianPayload([
            'school_id' => $school->id,
            'name' => 'Old Guardian',
            'email' => 'old@example.test',
        ]));
        $otherGuardian->students()->attach($student->id, [
            'school_id' => $school->id,
            'relationship' => 'Uncle',
            'is_primary' => true,
            'is_emergency_contact' => true,
            'pickup_allowed' => true,
        ]);
        $guardian = Guardian::create($this->guardianPayload(['school_id' => $school->id]));

        $response = $this->actingAs($admin)->putJson("/api/v1/guardians/{$guardian->id}/students", [
            'students' => [
                [
                    'student_id' => $student->id,
                    'relationship' => 'Father',
                    'is_primary' => true,
                    'is_emergency_contact' => true,
                    'pickup_allowed' => true,
                ],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.students.0.full_name', 'Aarav Sharma');
        $response->assertJsonPath('data.students.0.is_primary', true);

        $this->assertDatabaseHas('guardian_student', [
            'guardian_id' => $otherGuardian->id,
            'student_id' => $student->id,
            'is_primary' => false,
        ]);
        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'guardian_name' => 'Ravi Sharma',
            'guardian_phone' => '+91 90000 00001',
        ]);
        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'guardian.students_synced')->first()
        );
    }

    public function test_duplicate_child_links_are_rejected(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $student = $this->makeStudent($school);
        $guardian = Guardian::create($this->guardianPayload(['school_id' => $school->id]));

        $response = $this->actingAs($admin)->putJson("/api/v1/guardians/{$guardian->id}/students", [
            'students' => [
                ['student_id' => $student->id, 'relationship' => 'Father'],
                ['student_id' => $student->id, 'relationship' => 'Father'],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['students.1.student_id']);
    }

    public function test_admin_can_update_guardian_and_disable_portal_login(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $login = User::factory()->create([
            'school_id' => $school->id,
            'role' => 'parent',
            'status' => 'active',
        ]);
        $guardian = Guardian::create($this->guardianPayload([
            'school_id' => $school->id,
            'user_id' => $login->id,
        ]));

        $response = $this->actingAs($admin)->putJson("/api/v1/guardians/{$guardian->id}", $this->guardianPayload([
            'name' => 'Ravi Kumar',
            'portal_enabled' => false,
        ]));

        $response->assertOk();
        $response->assertJsonPath('data.name', 'Ravi Kumar');
        $response->assertJsonPath('data.portal.status', 'inactive');

        $this->assertDatabaseHas('users', [
            'id' => $login->id,
            'status' => 'inactive',
        ]);
    }

    public function test_admin_can_reset_parent_password_and_archive_guardian(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $login = User::factory()->create([
            'school_id' => $school->id,
            'role' => 'parent',
            'status' => 'suspended',
            'password' => Hash::make('OldPass@123'),
        ]);
        $guardian = Guardian::create($this->guardianPayload([
            'school_id' => $school->id,
            'user_id' => $login->id,
        ]));

        $reset = $this->actingAs($admin)->postJson("/api/v1/guardians/{$guardian->id}/reset-password", [
            'password' => 'NewPass@123',
        ]);

        $reset->assertOk();
        $this->assertTrue(Hash::check('NewPass@123', $login->fresh()->password));
        $this->assertDatabaseHas('users', [
            'id' => $login->id,
            'status' => 'active',
        ]);

        $archive = $this->actingAs($admin)->deleteJson("/api/v1/guardians/{$guardian->id}");
        $archive->assertOk();
        $archive->assertJsonPath('data.status', 'inactive');
        $archive->assertJsonPath('data.portal.status', 'inactive');
    }
}

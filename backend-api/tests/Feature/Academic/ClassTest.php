<?php

namespace Tests\Feature\Academic;

use App\Models\AuditLog;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(): School
    {
        return School::create([
            'name' => 'Demo School',
            'code' => 'Demo',
        ]);
    }

    private function makeUser(School $school, string $role): User
    {
        return User::factory()->create([
            'school_id' => $school->id,
            'role' => $role,
        ]);
    }

    public function test_admin_can_create_class_and_audit_log_is_created(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/classes', [
            'name' => 'Class 5',
            'sequence' => 5,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.name', 'Class 5');

        $this->assertDatabaseHas('classes', [
            'school_id' => $school->id,
            'name' => 'Class 5',
        ]);

        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'class.created')->first()
        );
    }

    public function test_duplicate_class_name_is_rejected(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5']);

        $response = $this->actingAs($admin)->postJson('/api/v1/classes', [
            'name' => 'Class 5',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }

    public function test_teacher_can_view_but_not_create_class(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');

        $this->actingAs($teacher)->getJson('/api/v1/classes')->assertOk();

        $this->actingAs($teacher)->postJson('/api/v1/classes', [
            'name' => 'Class 5',
        ])->assertStatus(403);
    }

    public function test_admin_can_update_and_delete_class(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $class = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5']);

        $update = $this->actingAs($admin)->putJson("/api/v1/classes/{$class->id}", [
            'name' => 'Class Five',
            'sequence' => 5,
        ]);

        $update->assertOk();
        $update->assertJsonPath('data.name', 'Class Five');

        $delete = $this->actingAs($admin)->deleteJson("/api/v1/classes/{$class->id}");
        $delete->assertOk();

        $this->assertDatabaseMissing('classes', ['id' => $class->id]);
    }
}

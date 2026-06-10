<?php

namespace Tests\Feature\Academic;

use App\Models\AuditLog;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubjectTest extends TestCase
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

    public function test_admin_can_create_subject_and_audit_log_is_created(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/subjects', [
            'name' => 'Mathematics',
            'code' => 'MATH',
            'type' => 'theory',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.name', 'Mathematics');

        $this->assertDatabaseHas('subjects', [
            'school_id' => $school->id,
            'name' => 'Mathematics',
        ]);

        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'subject.created')->first()
        );
    }

    public function test_teacher_can_view_but_not_create_subject(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');

        $this->actingAs($teacher)->getJson('/api/v1/subjects')->assertOk();

        $this->actingAs($teacher)->postJson('/api/v1/subjects', [
            'name' => 'Mathematics',
        ])->assertStatus(403);
    }

    public function test_admin_can_sync_classes_for_subject(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $subject = Subject::create(['school_id' => $school->id, 'name' => 'Mathematics']);
        $classA = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5']);
        $classB = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 6']);

        $response = $this->actingAs($admin)->putJson("/api/v1/subjects/{$subject->id}/classes", [
            'class_ids' => [$classA->id, $classB->id],
        ]);

        $response->assertOk();
        $response->assertJsonCount(2, 'data.classes');

        $this->assertDatabaseHas('class_subject', [
            'subject_id' => $subject->id,
            'class_id' => $classA->id,
            'school_id' => $school->id,
        ]);

        $detach = $this->actingAs($admin)->putJson("/api/v1/subjects/{$subject->id}/classes", [
            'class_ids' => [$classA->id],
        ]);

        $detach->assertOk();
        $detach->assertJsonCount(1, 'data.classes');

        $this->assertDatabaseMissing('class_subject', [
            'subject_id' => $subject->id,
            'class_id' => $classB->id,
        ]);

        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'subject.classes_synced')->first()
        );
    }

    public function test_duplicate_subject_name_is_rejected(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        Subject::create(['school_id' => $school->id, 'name' => 'Mathematics']);

        $response = $this->actingAs($admin)->postJson('/api/v1/subjects', [
            'name' => 'Mathematics',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }
}

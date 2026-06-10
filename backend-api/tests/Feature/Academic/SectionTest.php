<?php

namespace Tests\Feature\Academic;

use App\Models\AuditLog;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SectionTest extends TestCase
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

    public function test_admin_can_create_section_and_audit_log_is_created(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $class = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5']);

        $response = $this->actingAs($admin)->postJson('/api/v1/sections', [
            'class_id' => $class->id,
            'name' => 'A',
            'capacity' => 40,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.name', 'A');

        $this->assertDatabaseHas('sections', [
            'school_id' => $school->id,
            'class_id' => $class->id,
            'name' => 'A',
        ]);

        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'section.created')->first()
        );
    }

    public function test_duplicate_section_name_within_class_is_rejected(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $class = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5']);

        Section::create(['school_id' => $school->id, 'class_id' => $class->id, 'name' => 'A']);

        $response = $this->actingAs($admin)->postJson('/api/v1/sections', [
            'class_id' => $class->id,
            'name' => 'A',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }

    public function test_index_can_filter_by_class_id(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $classA = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5']);
        $classB = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 6']);

        Section::create(['school_id' => $school->id, 'class_id' => $classA->id, 'name' => 'A']);
        Section::create(['school_id' => $school->id, 'class_id' => $classB->id, 'name' => 'B']);

        $response = $this->actingAs($admin)->getJson("/api/v1/sections?class_id={$classA->id}");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'A');
    }

    public function test_teacher_can_view_but_not_create_section(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');
        $class = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5']);

        $this->actingAs($teacher)->getJson('/api/v1/sections')->assertOk();

        $this->actingAs($teacher)->postJson('/api/v1/sections', [
            'class_id' => $class->id,
            'name' => 'A',
        ])->assertStatus(403);
    }
}

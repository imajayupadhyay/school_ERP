<?php

namespace Tests\Feature\Academic;

use App\Models\AcademicSession;
use App\Models\AuditLog;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicSessionTest extends TestCase
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

    public function test_admin_can_create_session_and_audit_log_is_created(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/academic-sessions', [
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.name', '2026-2027');

        $this->assertDatabaseHas('academic_sessions', [
            'school_id' => $school->id,
            'name' => '2026-2027',
        ]);

        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'academic_session.created')->first()
        );
    }

    public function test_teacher_can_view_but_not_create_session(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');

        $this->actingAs($teacher)->getJson('/api/v1/academic-sessions')->assertOk();

        $this->actingAs($teacher)->postJson('/api/v1/academic-sessions', [
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
        ])->assertStatus(403);
    }

    public function test_validation_errors_for_invalid_dates(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/academic-sessions', [
            'name' => '2026-2027',
            'start_date' => '2027-04-01',
            'end_date' => '2026-03-31',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['end_date']);
    }

    public function test_set_current_unsets_other_sessions(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $sessionA = AcademicSession::create([
            'school_id' => $school->id,
            'name' => '2025-2026',
            'start_date' => '2025-04-01',
            'end_date' => '2026-03-31',
            'is_current' => true,
        ]);

        $sessionB = AcademicSession::create([
            'school_id' => $school->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => false,
        ]);

        $response = $this->actingAs($admin)->postJson("/api/v1/academic-sessions/{$sessionB->id}/set-current");

        $response->assertOk();
        $response->assertJsonPath('data.is_current', true);

        $this->assertFalse($sessionA->fresh()->is_current);
        $this->assertTrue($sessionB->fresh()->is_current);
    }

    public function test_cannot_delete_current_session(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $session = AcademicSession::create([
            'school_id' => $school->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/academic-sessions/{$session->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('academic_sessions', ['id' => $session->id]);
    }

    public function test_admin_can_delete_non_current_session(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $session = AcademicSession::create([
            'school_id' => $school->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => false,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/academic-sessions/{$session->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('academic_sessions', ['id' => $session->id]);
    }
}

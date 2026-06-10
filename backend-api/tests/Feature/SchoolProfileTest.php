<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SchoolProfileTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(): School
    {
        return School::create([
            'name' => 'Demo School',
            'code' => 'Demo',
            'email' => 'demo@school.test',
            'phone' => '9999999999',
        ]);
    }

    private function makeUser(School $school, string $role): User
    {
        return User::factory()->create([
            'school_id' => $school->id,
            'role' => $role,
        ]);
    }

    public function test_authenticated_user_can_view_own_school_profile(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $response = $this->actingAs($admin)->getJson('/api/v1/school-profile');

        $response->assertOk();
        $response->assertJsonPath('data.id', $school->id);
        $response->assertJsonPath('data.code', 'Demo');
        $response->assertJsonPath('data.country', 'India');
        $response->assertJsonPath('data.academic_year_start_month', 4);
    }

    public function test_school_admin_can_update_profile_and_audit_log_is_created(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $payload = [
            'name' => 'Updated School Name',
            'email' => 'updated@school.test',
            'academic_year_start_month' => 6,
            'board_affiliation' => 'CBSE',
            'principal_name' => 'Dr. Jane Doe',
            'established_year' => 1998,
            'city' => 'Pune',
            'state' => 'Maharashtra',
            'country' => 'India',
        ];

        $response = $this->actingAs($admin)->putJson('/api/v1/school-profile', $payload);

        $response->assertOk();
        $response->assertJsonPath('data.name', 'Updated School Name');
        $response->assertJsonPath('data.board_affiliation', 'CBSE');
        $response->assertJsonPath('data.academic_year_start_month', 6);

        $this->assertDatabaseHas('schools', [
            'id' => $school->id,
            'name' => 'Updated School Name',
            'board_affiliation' => 'CBSE',
        ]);

        $log = AuditLog::where('school_id', $school->id)
            ->where('action', 'school_profile.updated')
            ->first();

        $this->assertNotNull($log);
        $this->assertSame($admin->id, $log->user_id);
        $this->assertArrayHasKey('name', $log->changes);
        $this->assertSame('Demo School', $log->changes['name']['old']);
        $this->assertSame('Updated School Name', $log->changes['name']['new']);
    }

    public function test_principal_can_update_profile(): void
    {
        $school = $this->makeSchool();
        $principal = $this->makeUser($school, 'principal');

        $response = $this->actingAs($principal)->putJson('/api/v1/school-profile', [
            'name' => 'Principal Updated School',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.name', 'Principal Updated School');
    }

    public function test_non_admin_role_cannot_update_profile(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');

        $response = $this->actingAs($teacher)->putJson('/api/v1/school-profile', [
            'name' => 'Should Not Apply',
        ]);

        $response->assertStatus(403);

        $this->assertDatabaseHas('schools', [
            'id' => $school->id,
            'name' => 'Demo School',
        ]);
    }

    public function test_update_validates_input(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $response = $this->actingAs($admin)->putJson('/api/v1/school-profile', [
            'name' => '',
            'email' => 'not-an-email',
            'academic_year_start_month' => 13,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'email', 'academic_year_start_month']);
    }

    public function test_admin_can_upload_logo(): void
    {
        Storage::fake('public');

        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $file = UploadedFile::fake()->image('logo.png', 200, 200);

        $response = $this->actingAs($admin)->postJson('/api/v1/school-profile/logo', [
            'logo' => $file,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.logo_url', fn ($url) => $url !== null);

        $school->refresh();
        Storage::disk('public')->assertExists($school->logo_path);

        $log = AuditLog::where('school_id', $school->id)
            ->where('action', 'school_profile.logo_updated')
            ->first();

        $this->assertNotNull($log);
    }

    public function test_logo_upload_rejects_invalid_file_type(): void
    {
        Storage::fake('public');

        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $file = UploadedFile::fake()->create('logo.pdf', 100, 'application/pdf');

        $response = $this->actingAs($admin)->postJson('/api/v1/school-profile/logo', [
            'logo' => $file,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['logo']);
    }

    public function test_non_admin_cannot_upload_logo(): void
    {
        Storage::fake('public');

        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');

        $file = UploadedFile::fake()->image('logo.png');

        $response = $this->actingAs($teacher)->postJson('/api/v1/school-profile/logo', [
            'logo' => $file,
        ]);

        $response->assertStatus(403);
    }
}

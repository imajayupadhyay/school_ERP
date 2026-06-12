<?php

namespace Tests\Feature\Search;

use App\Models\Employee;
use App\Models\Guardian;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(string $code = 'Demo'): School
    {
        return School::create(['name' => "{$code} School", 'code' => $code]);
    }

    private function makeUser(School $school, string $role): User
    {
        return User::factory()->create(['school_id' => $school->id, 'role' => $role, 'status' => 'active']);
    }

    private function seedRecords(School $school): void
    {
        Student::create([
            'school_id' => $school->id,
            'admission_no' => 'ADM5001',
            'first_name' => 'Arjun',
            'last_name' => 'Kapoor',
            'class_name' => 'Grade 5',
            'section' => 'A',
            'roll_no' => '1',
            'status' => 'active',
        ]);
        Guardian::create(['school_id' => $school->id, 'name' => 'Arundhati Kapoor', 'relation' => 'Mother', 'phone' => '+91 9000000001', 'status' => 'active']);
        Employee::create(['school_id' => $school->id, 'employee_code' => 'EMP-AR1', 'first_name' => 'Aravind', 'last_name' => 'Rao', 'employee_type' => 'teaching', 'status' => 'active']);
        SchoolClass::create(['school_id' => $school->id, 'name' => 'Grade 5', 'sequence' => 5]);
    }

    public function test_admin_search_returns_all_permitted_groups(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $this->seedRecords($school);

        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=ar')->assertOk();

        $types = collect($response->json('data.groups'))->pluck('type')->all();
        $this->assertContains('students', $types);
        $this->assertContains('guardians', $types);
        $this->assertContains('employees', $types);
        $this->assertGreaterThan(0, $response->json('data.total'));
    }

    public function test_short_query_returns_no_results(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $this->seedRecords($school);

        $this->actingAs($admin)->getJson('/api/v1/search?q=a')
            ->assertOk()
            ->assertJsonPath('data.total', 0);
    }

    public function test_search_respects_view_permissions(): void
    {
        $school = $this->makeSchool();
        // Subject Teacher: has students.view + academic.view, but NOT guardians/employees view.
        $teacher = $this->makeUser($school, 'teacher');
        $this->seedRecords($school);

        $response = $this->actingAs($teacher)->getJson('/api/v1/search?q=ar')->assertOk();
        $types = collect($response->json('data.groups'))->pluck('type')->all();

        $this->assertContains('students', $types);
        $this->assertNotContains('guardians', $types);
        $this->assertNotContains('employees', $types);
    }

    public function test_search_is_tenant_scoped(): void
    {
        $schoolA = $this->makeSchool('Alpha');
        $schoolB = $this->makeSchool('Beta');
        $adminA = $this->makeUser($schoolA, 'school_admin');
        $this->seedRecords($schoolB); // records belong to the OTHER school

        $this->actingAs($adminA)->getJson('/api/v1/search?q=ar')
            ->assertOk()
            ->assertJsonPath('data.total', 0);
    }
}

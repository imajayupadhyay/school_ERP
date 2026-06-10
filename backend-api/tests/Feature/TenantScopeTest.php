<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantScopeTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(string $code): School
    {
        return School::create([
            'name' => "School {$code}",
            'code' => $code,
        ]);
    }

    private function makeStudent(School $school, string $name): Student
    {
        return Student::forSchool($school->id)->create([
            'school_id' => $school->id,
            'admission_no' => $name.'-ADM',
            'first_name' => $name,
            'last_name' => 'Test',
            'status' => 'active',
        ]);
    }

    public function test_global_scope_isolates_students_by_school(): void
    {
        $schoolA = $this->makeSchool('A');
        $schoolB = $this->makeSchool('B');

        $studentA = $this->makeStudent($schoolA, 'Alice');
        $studentB = $this->makeStudent($schoolB, 'Bob');

        $adminA = User::factory()->create(['school_id' => $schoolA->id, 'role' => 'school_admin']);

        $this->actingAs($adminA);

        $this->assertSame(1, Student::count());
        $this->assertSame($studentA->id, Student::first()->id);
        $this->assertNull(Student::find($studentB->id));
    }

    public function test_for_school_scope_overrides_global_scope(): void
    {
        $schoolA = $this->makeSchool('A');
        $schoolB = $this->makeSchool('B');

        $this->makeStudent($schoolA, 'Alice');
        $studentB = $this->makeStudent($schoolB, 'Bob');

        $adminA = User::factory()->create(['school_id' => $schoolA->id, 'role' => 'school_admin']);
        $this->actingAs($adminA);

        $this->assertSame($studentB->id, Student::forSchool($schoolB->id)->first()->id);
    }

    public function test_super_admin_is_not_scoped(): void
    {
        $schoolA = $this->makeSchool('A');
        $schoolB = $this->makeSchool('B');

        $this->makeStudent($schoolA, 'Alice');
        $this->makeStudent($schoolB, 'Bob');

        $superAdmin = User::factory()->create(['school_id' => null, 'role' => 'super_admin']);
        $this->actingAs($superAdmin);

        $this->assertSame(2, Student::count());
        $this->assertSame(2, Student::allSchools()->count());
    }

    public function test_school_id_is_auto_filled_on_create_from_authenticated_user(): void
    {
        $school = $this->makeSchool('A');
        $admin = User::factory()->create(['school_id' => $school->id, 'role' => 'school_admin']);

        $this->actingAs($admin);

        $student = Student::create([
            'admission_no' => 'AUTO-1',
            'first_name' => 'Auto',
            'last_name' => 'Filled',
            'status' => 'active',
        ]);

        $this->assertSame($school->id, $student->school_id);
    }
}

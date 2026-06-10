<?php

namespace Tests\Feature\Employees;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EmployeeTest extends TestCase
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
            'password' => Hash::make('Password@123'),
        ]);
    }

    private function employeePayload(array $overrides = []): array
    {
        return array_merge([
            'employee_code' => 'EMP001',
            'first_name' => 'Anita',
            'last_name' => 'Sharma',
            'gender' => 'female',
            'employee_type' => 'teaching',
            'designation' => 'Mathematics Teacher',
            'department' => 'Senior',
            'employment_type' => 'full_time',
            'joining_date' => '2024-04-01',
            'qualification' => 'B.Ed',
            'experience_years' => 7,
            'email' => 'anita@example.test',
            'phone' => '+91 90000 00001',
            'status' => 'active',
        ], $overrides);
    }

    public function test_admin_can_create_employee_with_login_and_audit_log(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/employees', $this->employeePayload([
            'login_enabled' => true,
            'login_email' => 'anita.login@example.test',
            'login_password' => 'Teacher@123',
            'login_role' => 'teacher',
        ]));

        $response->assertCreated();
        $response->assertJsonPath('data.employee_code', 'EMP001');
        $response->assertJsonPath('data.login.email', 'anita.login@example.test');
        $response->assertJsonPath('data.login.role', 'teacher');

        $this->assertDatabaseHas('employees', [
            'school_id' => $school->id,
            'employee_code' => 'EMP001',
            'email' => 'anita@example.test',
        ]);

        $this->assertDatabaseHas('users', [
            'school_id' => $school->id,
            'email' => 'anita.login@example.test',
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'employee.created')->first()
        );
    }

    public function test_employee_list_is_paginated_searchable_and_tenant_scoped(): void
    {
        $school = $this->makeSchool('A');
        $otherSchool = $this->makeSchool('B');
        $admin = $this->makeUser($school, 'school_admin');

        Employee::create($this->employeePayload([
            'school_id' => $school->id,
            'employee_code' => 'EMP001',
            'first_name' => 'Anita',
            'department' => 'Senior',
        ]));
        Employee::create($this->employeePayload([
            'school_id' => $school->id,
            'employee_code' => 'EMP002',
            'first_name' => 'Rahul',
            'email' => 'rahul@example.test',
            'department' => 'Primary',
        ]));
        Employee::create($this->employeePayload([
            'school_id' => $otherSchool->id,
            'employee_code' => 'EMP999',
            'first_name' => 'Hidden',
            'email' => 'hidden@example.test',
        ]));

        $response = $this->actingAs($admin)->getJson('/api/v1/employees?search=Anita&per_page=5');

        $response->assertOk();
        $response->assertJsonPath('data.meta.total', 1);
        $response->assertJsonPath('data.items.0.employee_code', 'EMP001');
        $response->assertJsonMissing(['employee_code' => 'EMP999']);
    }

    public function test_duplicate_employee_code_and_email_are_rejected_per_school(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        Employee::create($this->employeePayload(['school_id' => $school->id]));

        $response = $this->actingAs($admin)->postJson('/api/v1/employees', $this->employeePayload());

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['employee_code', 'email']);
    }

    public function test_teacher_can_view_but_not_create_employee(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');

        $this->actingAs($teacher)->getJson('/api/v1/employees')->assertOk();

        $this->actingAs($teacher)->postJson('/api/v1/employees', $this->employeePayload())
            ->assertStatus(403);
    }

    public function test_admin_can_update_employee_and_disable_existing_login(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $login = $this->makeUser($school, 'teacher');
        $employee = Employee::create($this->employeePayload([
            'school_id' => $school->id,
            'user_id' => $login->id,
        ]));

        $response = $this->actingAs($admin)->putJson("/api/v1/employees/{$employee->id}", $this->employeePayload([
            'employee_code' => 'EMP001',
            'first_name' => 'Anita',
            'last_name' => 'Rao',
            'email' => 'anita.rao@example.test',
            'login_enabled' => false,
        ]));

        $response->assertOk();
        $response->assertJsonPath('data.full_name', 'Anita Rao');
        $response->assertJsonPath('data.login.status', 'inactive');

        $this->assertDatabaseHas('users', [
            'id' => $login->id,
            'status' => 'inactive',
        ]);

        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'employee.updated')->first()
        );
    }

    public function test_admin_can_sync_valid_teacher_assignments(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $employee = Employee::create($this->employeePayload(['school_id' => $school->id]));
        $class = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5']);
        $section = Section::create(['school_id' => $school->id, 'class_id' => $class->id, 'name' => 'A']);
        $subject = Subject::create(['school_id' => $school->id, 'name' => 'Mathematics', 'code' => 'MATH']);
        $subject->classes()->attach($class->id, ['school_id' => $school->id]);

        $response = $this->actingAs($admin)->putJson("/api/v1/employees/{$employee->id}/assignments", [
            'assignments' => [
                [
                    'assignment_type' => 'subject_teacher',
                    'class_id' => $class->id,
                    'section_id' => $section->id,
                    'subject_id' => $subject->id,
                ],
                [
                    'assignment_type' => 'class_teacher',
                    'class_id' => $class->id,
                    'section_id' => $section->id,
                ],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonFragment(['name' => 'Mathematics']);

        $this->assertDatabaseCount('employee_assignments', 2);
        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'employee.assignments_synced')->first()
        );
    }

    public function test_assignment_validation_rejects_mismatched_section_and_unmapped_subject(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $employee = Employee::create($this->employeePayload(['school_id' => $school->id]));
        $class = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5']);
        $otherClass = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 6']);
        $section = Section::create(['school_id' => $school->id, 'class_id' => $otherClass->id, 'name' => 'A']);
        $subject = Subject::create(['school_id' => $school->id, 'name' => 'Mathematics', 'code' => 'MATH']);

        $response = $this->actingAs($admin)->putJson("/api/v1/employees/{$employee->id}/assignments", [
            'assignments' => [
                [
                    'assignment_type' => 'subject_teacher',
                    'class_id' => $class->id,
                    'section_id' => $section->id,
                    'subject_id' => $subject->id,
                ],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'assignments.0.section_id',
            'assignments.0.subject_id',
        ]);
    }

    public function test_delete_soft_deletes_employee_and_deactivates_linked_login(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $login = $this->makeUser($school, 'teacher');
        $employee = Employee::create($this->employeePayload([
            'school_id' => $school->id,
            'user_id' => $login->id,
        ]));

        $response = $this->actingAs($admin)->deleteJson("/api/v1/employees/{$employee->id}");

        $response->assertOk();
        $this->assertSoftDeleted('employees', ['id' => $employee->id]);
        $this->assertDatabaseHas('users', [
            'id' => $login->id,
            'status' => 'inactive',
        ]);
    }
}

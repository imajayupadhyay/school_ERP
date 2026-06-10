<?php

namespace Tests\Feature\Students;

use App\Models\AcademicSession;
use App\Models\AuditLog;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudentManagementTest extends TestCase
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

    /**
     * @return array{session: AcademicSession, class: SchoolClass, section: Section}
     */
    private function makeAcademicSetup(School $school): array
    {
        $session = AcademicSession::create([
            'school_id' => $school->id,
            'name' => '2026-27',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
        ]);
        $class = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5', 'sequence' => 5]);
        $section = Section::create(['school_id' => $school->id, 'class_id' => $class->id, 'name' => 'A']);

        return compact('session', 'class', 'section');
    }

    private function studentPayload(array $setup, array $overrides = []): array
    {
        return array_merge([
            'academic_session_id' => $setup['session']->id,
            'admission_no' => 'ADM001',
            'admission_type' => 'regular',
            'first_name' => 'Aarav',
            'last_name' => 'Sharma',
            'gender' => 'male',
            'date_of_birth' => '2016-05-10',
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'roll_no' => '12',
            'house' => 'Tagore',
            'category' => 'General',
            'blood_group' => 'O+',
            'primary_phone' => '+91 90000 00001',
            'current_address' => '12 Education Lane',
            'guardian_name' => 'Ravi Sharma',
            'guardian_phone' => '+91 90000 00002',
            'emergency_contact_name' => 'Ravi Sharma',
            'emergency_contact_phone' => '+91 90000 00002',
            'medical_conditions' => 'Asthma',
            'previous_school_name' => 'Old School',
            'status' => 'active',
            'admission_date' => '2026-04-05',
            'guardians' => [
                [
                    'name' => 'Ravi Sharma',
                    'relation' => 'Father',
                    'phone' => '+91 90000 00002',
                    'email' => 'ravi@example.test',
                    'occupation' => 'Engineer',
                    'is_primary' => true,
                    'is_emergency_contact' => true,
                    'pickup_allowed' => true,
                ],
            ],
        ], $overrides);
    }

    public function test_admin_can_create_student_with_guardian_and_audit_log(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeAcademicSetup($school);

        $response = $this->actingAs($admin)->postJson('/api/v1/students', $this->studentPayload($setup));

        $response->assertCreated();
        $response->assertJsonPath('data.admission_no', 'ADM001');
        $response->assertJsonPath('data.class_name', 'Class 5');
        $response->assertJsonPath('data.section', 'A');
        $response->assertJsonPath('data.guardians.0.name', 'Ravi Sharma');

        $this->assertDatabaseHas('students', [
            'school_id' => $school->id,
            'admission_no' => 'ADM001',
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'class_name' => 'Class 5',
            'section' => 'A',
        ]);
        $this->assertDatabaseHas('guardians', [
            'school_id' => $school->id,
            'name' => 'Ravi Sharma',
            'phone' => '+91 90000 00002',
        ]);
        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'student.created')->first()
        );
    }

    public function test_student_list_is_paginated_filterable_and_tenant_scoped(): void
    {
        $school = $this->makeSchool('A');
        $otherSchool = $this->makeSchool('B');
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeAcademicSetup($school);

        Student::create([
            'school_id' => $school->id,
            'academic_session_id' => $setup['session']->id,
            'admission_no' => 'ADM001',
            'first_name' => 'Aarav',
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'class_name' => 'Class 5',
            'section' => 'A',
            'status' => 'active',
        ]);
        Student::create([
            'school_id' => $school->id,
            'admission_no' => 'ADM002',
            'first_name' => 'Diya',
            'status' => 'inactive',
        ]);
        Student::create([
            'school_id' => $otherSchool->id,
            'admission_no' => 'ADM999',
            'first_name' => 'Hidden',
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin)->getJson("/api/v1/students?search=Aarav&class_id={$setup['class']->id}&status=active&per_page=5");

        $response->assertOk();
        $response->assertJsonPath('data.meta.total', 1);
        $response->assertJsonPath('data.items.0.admission_no', 'ADM001');
        $response->assertJsonMissing(['admission_no' => 'ADM999']);
    }

    public function test_duplicate_admission_and_roll_number_are_rejected(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeAcademicSetup($school);

        Student::create([
            'school_id' => $school->id,
            'academic_session_id' => $setup['session']->id,
            'admission_no' => 'ADM001',
            'first_name' => 'Aarav',
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'roll_no' => '12',
        ]);

        $response = $this->actingAs($admin)->postJson('/api/v1/students', $this->studentPayload($setup));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['admission_no', 'roll_no']);
    }

    public function test_section_must_belong_to_selected_class(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeAcademicSetup($school);
        $otherClass = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 6']);
        $otherSection = Section::create(['school_id' => $school->id, 'class_id' => $otherClass->id, 'name' => 'B']);

        $response = $this->actingAs($admin)->postJson('/api/v1/students', $this->studentPayload($setup, [
            'section_id' => $otherSection->id,
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['section_id']);
    }

    public function test_teacher_can_view_but_not_create_students(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');
        $setup = $this->makeAcademicSetup($school);

        $this->actingAs($teacher)->getJson('/api/v1/students')->assertOk();

        $this->actingAs($teacher)->postJson('/api/v1/students', $this->studentPayload($setup))
            ->assertStatus(403);
    }

    public function test_admin_can_archive_and_transfer_student(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeAcademicSetup($school);
        $student = Student::create([
            'school_id' => $school->id,
            'academic_session_id' => $setup['session']->id,
            'admission_no' => 'ADM001',
            'first_name' => 'Aarav',
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'status' => 'active',
        ]);
        $targetClass = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 6']);
        $targetSection = Section::create(['school_id' => $school->id, 'class_id' => $targetClass->id, 'name' => 'B']);

        $transfer = $this->actingAs($admin)->postJson("/api/v1/students/{$student->id}/transfer", [
            'transfer_type' => 'internal',
            'class_id' => $targetClass->id,
            'section_id' => $targetSection->id,
            'roll_no' => '4',
            'transfer_reason' => 'Section reallocation',
        ]);

        $transfer->assertOk();
        $transfer->assertJsonPath('data.class_name', 'Class 6');
        $transfer->assertJsonPath('data.section', 'B');

        $archive = $this->actingAs($admin)->deleteJson("/api/v1/students/{$student->id}");
        $archive->assertOk();
        $archive->assertJsonPath('data.status', 'archived');

        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'student.internal_transfer')->first()
        );
        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'student.archived')->first()
        );
    }

    public function test_admin_can_promote_students(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeAcademicSetup($school);
        $targetClass = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 6']);
        $targetSection = Section::create(['school_id' => $school->id, 'class_id' => $targetClass->id, 'name' => 'A']);
        Student::create([
            'school_id' => $school->id,
            'academic_session_id' => $setup['session']->id,
            'admission_no' => 'ADM001',
            'first_name' => 'Aarav',
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'roll_no' => '12',
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin)->postJson('/api/v1/students/promote', [
            'from_academic_session_id' => $setup['session']->id,
            'from_class_id' => $setup['class']->id,
            'from_section_id' => $setup['section']->id,
            'to_academic_session_id' => $setup['session']->id,
            'to_class_id' => $targetClass->id,
            'to_section_id' => $targetSection->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.count', 1);

        $this->assertDatabaseHas('students', [
            'school_id' => $school->id,
            'admission_no' => 'ADM001',
            'class_id' => $targetClass->id,
            'section_id' => $targetSection->id,
            'roll_no' => null,
        ]);
    }

    public function test_admin_can_upload_photo_and_view_history_and_export(): void
    {
        Storage::fake('public');

        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $student = Student::create([
            'school_id' => $school->id,
            'admission_no' => 'ADM001',
            'first_name' => 'Aarav',
            'status' => 'active',
        ]);

        $photo = $this->actingAs($admin)->postJson("/api/v1/students/{$student->id}/photo", [
            'photo' => UploadedFile::fake()->image('student.jpg', 320, 320),
        ]);

        $photo->assertOk();
        $this->assertNotNull($student->fresh()->photo_path);
        Storage::disk('public')->assertExists($student->fresh()->photo_path);

        $history = $this->actingAs($admin)->getJson("/api/v1/students/{$student->id}/history");
        $history->assertOk();
        $history->assertJsonFragment(['action' => 'student.photo_updated']);

        $export = $this->actingAs($admin)->get('/api/v1/students/export');
        $export->assertOk();
        $this->assertStringContainsString('students.csv', $export->headers->get('content-disposition'));
    }
}

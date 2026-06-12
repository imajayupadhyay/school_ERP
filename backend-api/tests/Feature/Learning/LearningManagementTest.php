<?php

namespace Tests\Feature\Learning;

use App\Models\AcademicSession;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\EmployeeAssignment;
use App\Models\HomeworkAssignment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\StudyMaterial;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LearningManagementTest extends TestCase
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

    /**
     * @return array{session: AcademicSession, class: SchoolClass, section: Section, subject: Subject}
     */
    private function makeSetup(School $school, string $className = 'Class 5', string $sectionName = 'A', string $subjectName = 'Mathematics'): array
    {
        $session = AcademicSession::firstOrCreate(
            ['school_id' => $school->id, 'name' => '2026-27'],
            [
                'start_date' => '2026-04-01',
                'end_date' => '2027-03-31',
                'is_current' => true,
                'status' => 'active',
            ],
        );
        $class = SchoolClass::create(['school_id' => $school->id, 'name' => $className, 'sequence' => 5]);
        $section = Section::create(['school_id' => $school->id, 'class_id' => $class->id, 'name' => $sectionName]);
        $subject = Subject::create(['school_id' => $school->id, 'name' => $subjectName, 'code' => strtoupper(substr($subjectName, 0, 4))]);
        $subject->classes()->attach($class->id, ['school_id' => $school->id]);

        return compact('session', 'class', 'section', 'subject');
    }

    private function assignTeacher(User $teacher, array $setup, string $type = 'class_teacher'): void
    {
        $employee = Employee::create([
            'school_id' => $teacher->school_id,
            'user_id' => $teacher->id,
            'employee_code' => 'EMP'.random_int(100, 999),
            'first_name' => 'Anita',
            'last_name' => 'Rao',
            'employee_type' => 'teaching',
            'status' => 'active',
        ]);

        EmployeeAssignment::create([
            'school_id' => $teacher->school_id,
            'employee_id' => $employee->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'subject_id' => $type === 'subject_teacher' ? $setup['subject']->id : null,
            'assignment_type' => $type,
            'status' => 'active',
        ]);
    }

    private function homeworkPayload(array $setup, array $overrides = []): array
    {
        return array_merge([
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'subject_id' => $setup['subject']->id,
            'title' => 'Algebra Practice',
            'instructions' => 'Complete questions 1 to 10.',
            'assigned_date' => '2026-06-10',
            'due_date' => '2026-06-15',
            'submission_required' => true,
            'status' => 'published',
        ], $overrides);
    }

    private function materialPayload(array $setup, array $overrides = []): array
    {
        return array_merge([
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'subject_id' => $setup['subject']->id,
            'title' => 'Algebra Notes',
            'description' => 'Revision notes for linear equations.',
            'material_type' => 'note',
            'status' => 'published',
        ], $overrides);
    }

    public function test_admin_can_create_homework_and_upload_attachment(): void
    {
        Storage::fake('public');
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);

        $response = $this->actingAs($admin)->postJson('/api/v1/homework', $this->homeworkPayload($setup));

        $response->assertCreated();
        $response->assertJsonPath('data.title', 'Algebra Practice');
        $response->assertJsonPath('data.status', 'published');
        $this->assertDatabaseHas('homework_assignments', ['school_id' => $school->id, 'title' => 'Algebra Practice']);
        $this->assertNotNull(AuditLog::where('school_id', $school->id)->where('action', 'homework.created')->first());

        $homeworkId = $response->json('data.id');
        $upload = $this->actingAs($admin)->postJson("/api/v1/homework/{$homeworkId}/attachment", [
            'attachment' => UploadedFile::fake()->create('worksheet.pdf', 24, 'application/pdf'),
        ]);

        $upload->assertOk();
        $path = $upload->json('data.attachment_path');
        Storage::disk('public')->assertExists($path);
        $this->assertNotNull(AuditLog::where('school_id', $school->id)->where('action', 'homework.attachment_uploaded')->first());
    }

    public function test_teacher_can_create_homework_only_for_assigned_scope(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');
        $setup = $this->makeSetup($school);
        $otherSetup = $this->makeSetup($school, 'Class 6', 'A', 'Science');
        $this->assignTeacher($teacher, $setup, 'subject_teacher');

        $this->actingAs($teacher)
            ->postJson('/api/v1/homework', $this->homeworkPayload($setup))
            ->assertCreated();

        $this->actingAs($teacher)
            ->postJson('/api/v1/homework', $this->homeworkPayload($otherSetup))
            ->assertStatus(403);
    }

    public function test_homework_validation_rejects_invalid_roster_references(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $otherSetup = $this->makeSetup($school, 'Class 6', 'B', 'Science');
        $unmappedSubject = Subject::create(['school_id' => $school->id, 'name' => 'Hindi', 'code' => 'HIND']);

        $this->actingAs($admin)->postJson('/api/v1/homework', $this->homeworkPayload($setup, [
            'section_id' => $otherSetup['section']->id,
            'subject_id' => $unmappedSubject->id,
            'due_date' => '2026-06-01',
        ]))->assertStatus(422)->assertJsonValidationErrors(['section_id', 'subject_id', 'due_date']);
    }

    public function test_homework_list_is_tenant_and_teacher_scoped(): void
    {
        $school = $this->makeSchool('A');
        $otherSchool = $this->makeSchool('B');
        $teacher = $this->makeUser($school, 'teacher');
        $admin = $this->makeUser($school, 'school_admin');
        $otherAdmin = $this->makeUser($otherSchool, 'school_admin');
        $setup = $this->makeSetup($school);
        $otherSetup = $this->makeSetup($otherSchool);
        $this->assignTeacher($teacher, $setup);

        $this->actingAs($admin)->postJson('/api/v1/homework', $this->homeworkPayload($setup, ['title' => 'Visible Homework']))->assertCreated();
        $this->actingAs($otherAdmin)->postJson('/api/v1/homework', $this->homeworkPayload($otherSetup, ['title' => 'Hidden Homework']))->assertCreated();

        $this->actingAs($teacher)
            ->getJson('/api/v1/homework?search=Homework')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.items.0.title', 'Visible Homework')
            ->assertJsonMissing(['title' => 'Hidden Homework']);
    }

    public function test_admin_can_create_update_and_archive_study_material(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);

        $response = $this->actingAs($admin)->postJson('/api/v1/study-materials', $this->materialPayload($setup, [
            'title' => 'Video Lecture',
            'material_type' => 'video',
            'content_url' => 'https://example.com/video',
        ]));

        $response->assertCreated();
        $response->assertJsonPath('data.material_type', 'video');
        $this->assertNotNull(AuditLog::where('school_id', $school->id)->where('action', 'study_material.created')->first());

        $materialId = $response->json('data.id');
        $this->actingAs($admin)
            ->putJson("/api/v1/study-materials/{$materialId}", $this->materialPayload($setup, [
                'title' => 'Updated Video Lecture',
                'material_type' => 'video',
                'content_url' => 'https://example.com/updated-video',
            ]))
            ->assertOk()
            ->assertJsonPath('data.title', 'Updated Video Lecture');

        $this->actingAs($admin)
            ->deleteJson("/api/v1/study-materials/{$materialId}")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');
    }

    public function test_study_material_requires_url_for_video_and_supports_file_upload(): void
    {
        Storage::fake('public');
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);

        $this->actingAs($admin)->postJson('/api/v1/study-materials', $this->materialPayload($setup, [
            'material_type' => 'video',
            'content_url' => null,
        ]))->assertStatus(422)->assertJsonValidationErrors(['content_url']);

        $material = StudyMaterial::create([
            'school_id' => $school->id,
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'subject_id' => $setup['subject']->id,
            'created_by' => $admin->id,
            'title' => 'Worksheet',
            'material_type' => 'worksheet',
            'status' => 'draft',
        ]);

        $upload = $this->actingAs($admin)->postJson("/api/v1/study-materials/{$material->id}/attachment", [
            'attachment' => UploadedFile::fake()->create('worksheet.pdf', 24, 'application/pdf'),
        ]);

        $upload->assertOk();
        Storage::disk('public')->assertExists($upload->json('data.attachment_path'));
    }

    public function test_teacher_can_create_material_only_for_assigned_scope(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');
        $setup = $this->makeSetup($school);
        $otherSetup = $this->makeSetup($school, 'Class 7', 'A', 'Science');
        $this->assignTeacher($teacher, $setup);

        $this->actingAs($teacher)
            ->postJson('/api/v1/study-materials', $this->materialPayload($setup))
            ->assertCreated();

        $this->actingAs($teacher)
            ->postJson('/api/v1/study-materials', $this->materialPayload($otherSetup))
            ->assertStatus(403);
    }
}

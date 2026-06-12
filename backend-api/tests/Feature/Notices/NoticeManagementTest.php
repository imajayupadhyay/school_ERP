<?php

namespace Tests\Feature\Notices;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\EmployeeAssignment;
use App\Models\Guardian;
use App\Models\Notice;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class NoticeManagementTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(string $code = 'Demo'): School
    {
        return School::create(['name' => "{$code} School", 'code' => $code]);
    }

    private function makeUser(School $school, string $role, string $name = 'Test User'): User
    {
        return User::factory()->create([
            'school_id' => $school->id,
            'name' => $name,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    /**
     * @return array{class: SchoolClass, section: Section}
     */
    private function makeClass(School $school, string $name = 'Grade 5', string $sectionName = 'A'): array
    {
        $class = SchoolClass::create([
            'school_id' => $school->id,
            'name' => $name,
            'sequence' => 5,
            'status' => 'active',
        ]);
        $section = Section::create([
            'school_id' => $school->id,
            'class_id' => $class->id,
            'name' => $sectionName,
            'status' => 'active',
        ]);

        return compact('class', 'section');
    }

    private function assignTeacher(User $teacher, array $setup, bool $allSections = false): Employee
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
            'section_id' => $allSections ? null : $setup['section']->id,
            'assignment_type' => 'class_teacher',
            'status' => 'active',
        ]);

        return $employee;
    }

    /**
     * @return array{student: Student, guardian: Guardian}
     */
    private function linkParent(User $parent, array $setup): array
    {
        $student = Student::create([
            'school_id' => $parent->school_id,
            'admission_no' => 'ADM-001',
            'first_name' => 'Aarav',
            'last_name' => 'Sharma',
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'class_name' => $setup['class']->name,
            'section' => $setup['section']->name,
            'status' => 'active',
        ]);
        $guardian = Guardian::create([
            'school_id' => $parent->school_id,
            'user_id' => $parent->id,
            'name' => $parent->name,
            'status' => 'active',
        ]);
        $guardian->students()->attach($student->id, [
            'school_id' => $parent->school_id,
            'relationship' => 'Father',
            'is_primary' => true,
            'is_emergency_contact' => true,
            'pickup_allowed' => true,
        ]);

        return compact('student', 'guardian');
    }

    /**
     * @param  array<int, array{type: string, id?: int, value?: string}>  $targets
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $targets, array $overrides = []): array
    {
        return array_merge([
            'title' => 'School Foundation Day',
            'body' => 'The school will celebrate Foundation Day in the main auditorium.',
            'category' => 'event',
            'priority' => 'important',
            'status' => 'published',
            'publish_at' => now()->toISOString(),
            'expires_at' => now()->addDays(7)->toISOString(),
            'targets' => $targets,
        ], $overrides);
    }

    public function test_admin_can_create_notice_with_normalized_targets_and_audit_log(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeClass($school);

        $response = $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'role', 'value' => 'parent'],
            ['type' => 'class', 'id' => $setup['class']->id],
        ]));

        $response->assertCreated()
            ->assertJsonPath('data.title', 'School Foundation Day')
            ->assertJsonPath('data.delivery_status', 'published')
            ->assertJsonCount(2, 'data.targets');

        $noticeId = $response->json('data.id');
        $this->assertDatabaseHas('notice_targets', [
            'notice_id' => $noticeId,
            'target_type' => 'class',
            'target_id' => $setup['class']->id,
            'target_label' => 'Grade 5',
        ]);
        $this->assertNotNull(
            AuditLog::where('school_id', $school->id)->where('action', 'notice.created')->first(),
        );
    }

    public function test_notice_validation_rejects_invalid_targets_and_publication_dates(): void
    {
        $school = $this->makeSchool('A');
        $otherSchool = $this->makeSchool('B');
        $admin = $this->makeUser($school, 'school_admin');
        $otherSetup = $this->makeClass($otherSchool);

        $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'section', 'id' => $otherSetup['section']->id],
            ['type' => 'role', 'value' => 'invalid-role'],
            ['type' => 'role', 'value' => 'invalid-role'],
        ], [
            'status' => 'scheduled',
            'publish_at' => now()->subHour()->toISOString(),
            'expires_at' => now()->subDay()->toISOString(),
        ]))->assertStatus(422)
            ->assertJsonValidationErrors([
                'publish_at',
                'expires_at',
                'targets.0.id',
                'targets.1.value',
                'targets.2',
            ]);
    }

    public function test_assigned_teacher_sees_relevant_live_notices_only(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $teacher = $this->makeUser($school, 'teacher');
        $classWideTeacher = $this->makeUser($school, 'teacher');
        $assigned = $this->makeClass($school, 'Grade 5');
        $other = $this->makeClass($school, 'Grade 6');
        $this->assignTeacher($teacher, $assigned);
        $this->assignTeacher($classWideTeacher, $assigned, true);

        $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'class', 'id' => $assigned['class']->id],
        ], ['title' => 'Visible Class Notice']))->assertCreated();

        $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'class', 'id' => $other['class']->id],
        ], ['title' => 'Hidden Class Notice']))->assertCreated();

        $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'section', 'id' => $assigned['section']->id],
        ], ['title' => 'Visible Section Notice']))->assertCreated();

        $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'role', 'value' => 'teacher'],
        ], ['title' => 'Teacher Notice']))->assertCreated();

        $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'school'],
        ], ['title' => 'Draft Notice', 'status' => 'draft', 'publish_at' => null]))->assertCreated();

        Notice::create([
            'school_id' => $school->id,
            'created_by' => $admin->id,
            'title' => 'Expired Notice',
            'body' => 'Expired',
            'category' => 'general',
            'priority' => 'normal',
            'status' => 'published',
            'publish_at' => now()->subDays(2),
            'published_at' => now()->subDays(2),
            'expires_at' => now()->subDay(),
        ])->targets()->create([
            'school_id' => $school->id,
            'target_type' => 'school',
            'target_label' => 'Entire school',
        ]);

        $this->actingAs($teacher)
            ->getJson('/api/v1/notices?per_page=20')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 3)
            ->assertJsonFragment(['title' => 'Visible Class Notice'])
            ->assertJsonFragment(['title' => 'Visible Section Notice'])
            ->assertJsonFragment(['title' => 'Teacher Notice'])
            ->assertJsonMissing(['title' => 'Hidden Class Notice'])
            ->assertJsonMissing(['title' => 'Draft Notice'])
            ->assertJsonMissing(['title' => 'Expired Notice']);

        $this->actingAs($classWideTeacher)
            ->getJson('/api/v1/notices?search=Visible%20Section')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.items.0.title', 'Visible Section Notice');
    }

    public function test_scheduled_notice_becomes_visible_without_status_job(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $teacher = $this->makeUser($school, 'teacher');

        $notice = Notice::create([
            'school_id' => $school->id,
            'created_by' => $admin->id,
            'title' => 'Scheduled Notice',
            'body' => 'Visible after its publish time.',
            'category' => 'general',
            'priority' => 'normal',
            'status' => 'scheduled',
            'publish_at' => now()->addHour(),
        ]);
        $notice->targets()->create([
            'school_id' => $school->id,
            'target_type' => 'school',
            'target_label' => 'Entire school',
        ]);

        $this->actingAs($teacher)->getJson('/api/v1/notices')->assertJsonPath('data.meta.total', 0);

        $this->travel(2)->hours();

        $this->actingAs($teacher)
            ->getJson('/api/v1/notices')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.items.0.delivery_status', 'published');
    }

    public function test_parent_sees_class_and_direct_student_notices(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $parent = $this->makeUser($school, 'parent', 'Raj Sharma');
        $setup = $this->makeClass($school);
        $other = $this->makeClass($school, 'Grade 8');
        $linked = $this->linkParent($parent, $setup);

        $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'class', 'id' => $setup['class']->id],
        ], ['title' => 'Class Notice']))->assertCreated();

        $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'student', 'id' => $linked['student']->id],
        ], ['title' => 'Student Notice']))->assertCreated();

        $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'class', 'id' => $other['class']->id],
        ], ['title' => 'Other Class Notice']))->assertCreated();

        $this->actingAs($parent)
            ->getJson('/api/v1/notices?per_page=20')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 2)
            ->assertJsonFragment(['title' => 'Class Notice'])
            ->assertJsonFragment(['title' => 'Student Notice'])
            ->assertJsonMissing(['title' => 'Other Class Notice']);
    }

    public function test_non_manager_cannot_create_update_or_archive_notice(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $teacher = $this->makeUser($school, 'teacher');

        $noticeId = $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'school'],
        ]))->json('data.id');

        $this->actingAs($teacher)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'school'],
        ]))->assertStatus(403);
        $this->actingAs($teacher)->putJson("/api/v1/notices/{$noticeId}", $this->payload([
            ['type' => 'school'],
        ]))->assertStatus(403);
        $this->actingAs($teacher)->deleteJson("/api/v1/notices/{$noticeId}")->assertStatus(403);
    }

    public function test_attachment_read_receipt_and_delivery_tracking(): void
    {
        Storage::fake('public');
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $teacher = $this->makeUser($school, 'teacher');

        $noticeId = $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'school'],
        ]))->json('data.id');

        $upload = $this->actingAs($admin)->postJson("/api/v1/notices/{$noticeId}/attachment", [
            'attachment' => UploadedFile::fake()->create('circular.pdf', 30, 'application/pdf'),
        ]);
        $upload->assertOk();
        Storage::disk('public')->assertExists($upload->json('data.attachment_path'));

        $this->actingAs($teacher)
            ->postJson("/api/v1/notices/{$noticeId}/read")
            ->assertOk();
        $this->actingAs($teacher)
            ->postJson("/api/v1/notices/{$noticeId}/read")
            ->assertOk();

        $this->assertDatabaseCount('notice_reads', 1);

        $this->actingAs($admin)
            ->getJson("/api/v1/notices/{$noticeId}/delivery")
            ->assertOk()
            ->assertJsonPath('data.recipient_count', 2)
            ->assertJsonPath('data.read_count', 1)
            ->assertJsonPath('data.unread_count', 1);
    }

    public function test_notice_queries_and_targets_are_tenant_scoped(): void
    {
        $school = $this->makeSchool('A');
        $otherSchool = $this->makeSchool('B');
        $admin = $this->makeUser($school, 'school_admin');
        $otherAdmin = $this->makeUser($otherSchool, 'school_admin');

        $this->actingAs($admin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'school'],
        ], ['title' => 'School A Notice']))->assertCreated();
        $otherNoticeId = $this->actingAs($otherAdmin)->postJson('/api/v1/notices', $this->payload([
            ['type' => 'school'],
        ], ['title' => 'School B Notice']))->json('data.id');

        $this->actingAs($admin)
            ->getJson('/api/v1/notices')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonFragment(['title' => 'School A Notice'])
            ->assertJsonMissing(['title' => 'School B Notice']);

        $this->actingAs($admin)->getJson("/api/v1/notices/{$otherNoticeId}")->assertNotFound();
    }
}

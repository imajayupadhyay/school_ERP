<?php

namespace Tests\Feature\Timetables;

use App\Models\AcademicSession;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\PeriodSlot;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimetableManagementTest extends TestCase
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

    private function makeSession(School $school): AcademicSession
    {
        return AcademicSession::firstOrCreate(
            ['school_id' => $school->id, 'name' => '2026-27'],
            ['start_date' => '2026-04-01', 'end_date' => '2027-03-31', 'is_current' => true, 'status' => 'active'],
        );
    }

    /**
     * @return array{class: SchoolClass, section: Section, subjects: array<int, Subject>}
     */
    private function makeClass(School $school, string $className, string $sectionName, int $seq): array
    {
        $class = SchoolClass::create(['school_id' => $school->id, 'name' => $className, 'sequence' => $seq]);
        $section = Section::create(['school_id' => $school->id, 'class_id' => $class->id, 'name' => $sectionName]);
        $subjects = collect(['Mathematics', 'Science'])->map(function (string $name) use ($school, $class, $seq) {
            $subject = Subject::create([
                'school_id' => $school->id,
                'name' => "{$name} {$class->name}",
                'code' => strtoupper(substr($name, 0, 4)).$seq,
            ]);
            $subject->classes()->attach($class->id, ['school_id' => $school->id]);

            return $subject;
        })->all();

        return compact('class', 'section', 'subjects');
    }

    private function makeSlot(School $school, int $sequence, bool $break = false): PeriodSlot
    {
        return PeriodSlot::create([
            'school_id' => $school->id,
            'name' => $break ? "Break {$sequence}" : "Period {$sequence}",
            'sequence' => $sequence,
            'is_break' => $break,
            'status' => 'active',
        ]);
    }

    private function makeTeacher(School $school, ?User $user = null): Employee
    {
        return Employee::create([
            'school_id' => $school->id,
            'user_id' => $user?->id,
            'employee_code' => 'EMP'.random_int(1000, 9999),
            'first_name' => 'Teacher'.random_int(1, 999),
            'employee_type' => 'teaching',
            'status' => 'active',
        ]);
    }

    private function makeTimetable(School $school, AcademicSession $session, array $setup, string $status = 'draft'): Timetable
    {
        return Timetable::create([
            'school_id' => $school->id,
            'academic_session_id' => $session->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'status' => $status,
        ]);
    }

    public function test_admin_can_manage_period_slots_with_audit(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $create = $this->actingAs($admin)->postJson('/api/v1/period-slots', [
            'name' => 'Period 1',
            'sequence' => 1,
            'start_time' => '08:00',
            'end_time' => '08:45',
        ])->assertCreated();

        $slotId = $create->json('data.id');

        $this->actingAs($admin)->putJson("/api/v1/period-slots/{$slotId}", [
            'name' => 'First Period',
            'sequence' => 1,
        ])->assertOk()->assertJsonPath('data.name', 'First Period');

        $this->actingAs($admin)->deleteJson("/api/v1/period-slots/{$slotId}")->assertOk();

        $this->assertDatabaseMissing('period_slots', ['id' => $slotId]);
        $this->assertNotNull(AuditLog::where('action', 'period_slot.created')->first());
        $this->assertNotNull(AuditLog::where('action', 'period_slot.deleted')->first());
    }

    public function test_admin_can_create_timetable_and_save_entries(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $session = $this->makeSession($school);
        $setup = $this->makeClass($school, 'Class 5', 'A', 5);
        $slot = $this->makeSlot($school, 1);
        $teacher = $this->makeTeacher($school);

        $create = $this->actingAs($admin)->postJson('/api/v1/timetables', [
            'academic_session_id' => $session->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
        ])->assertCreated();

        $timetableId = $create->json('data.id');

        $this->actingAs($admin)->putJson("/api/v1/timetables/{$timetableId}/entries", [
            'entries' => [
                ['day_of_week' => 1, 'period_slot_id' => $slot->id, 'subject_id' => $setup['subjects'][0]->id, 'employee_id' => $teacher->id],
            ],
        ])->assertOk()->assertJsonCount(1, 'data.entries');

        $this->assertDatabaseHas('timetable_entries', [
            'timetable_id' => $timetableId,
            'day_of_week' => 1,
            'period_slot_id' => $slot->id,
            'employee_id' => $teacher->id,
        ]);
        $this->assertNotNull(AuditLog::where('action', 'timetable.created')->first());
        $this->assertNotNull(AuditLog::where('action', 'timetable.entries_updated')->first());
    }

    public function test_timetable_is_unique_per_class_section(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $session = $this->makeSession($school);
        $setup = $this->makeClass($school, 'Class 5', 'A', 5);
        $this->makeTimetable($school, $session, $setup);

        $this->actingAs($admin)->postJson('/api/v1/timetables', [
            'academic_session_id' => $session->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['section_id']);
    }

    public function test_entries_reject_unmapped_subject_and_break_slot(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $session = $this->makeSession($school);
        $setup = $this->makeClass($school, 'Class 5', 'A', 5);
        $other = $this->makeClass($school, 'Class 6', 'B', 6); // its subject is NOT mapped to Class 5
        $slot = $this->makeSlot($school, 1);
        $breakSlot = $this->makeSlot($school, 2, true);
        $teacher = $this->makeTeacher($school);
        $timetable = $this->makeTimetable($school, $session, $setup);

        // Unmapped subject.
        $this->actingAs($admin)->putJson("/api/v1/timetables/{$timetable->id}/entries", [
            'entries' => [
                ['day_of_week' => 1, 'period_slot_id' => $slot->id, 'subject_id' => $other['subjects'][0]->id, 'employee_id' => $teacher->id],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['entries.0.subject_id']);

        // Break slot cannot hold a class.
        $this->actingAs($admin)->putJson("/api/v1/timetables/{$timetable->id}/entries", [
            'entries' => [
                ['day_of_week' => 1, 'period_slot_id' => $breakSlot->id, 'subject_id' => $setup['subjects'][0]->id, 'employee_id' => $teacher->id],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['entries.0.period_slot_id']);
    }

    public function test_teacher_double_booking_is_blocked(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $session = $this->makeSession($school);
        $setupA = $this->makeClass($school, 'Class 5', 'A', 5);
        $setupB = $this->makeClass($school, 'Class 6', 'B', 6);
        $slot = $this->makeSlot($school, 1);
        $teacher = $this->makeTeacher($school);

        $timetableA = $this->makeTimetable($school, $session, $setupA);
        $timetableB = $this->makeTimetable($school, $session, $setupB);

        // Book the teacher in timetable A, Monday period 1.
        $this->actingAs($admin)->putJson("/api/v1/timetables/{$timetableA->id}/entries", [
            'entries' => [
                ['day_of_week' => 1, 'period_slot_id' => $slot->id, 'subject_id' => $setupA['subjects'][0]->id, 'employee_id' => $teacher->id],
            ],
        ])->assertOk();

        // Same teacher, same day + period, in timetable B → blocked.
        $this->actingAs($admin)->putJson("/api/v1/timetables/{$timetableB->id}/entries", [
            'entries' => [
                ['day_of_week' => 1, 'period_slot_id' => $slot->id, 'subject_id' => $setupB['subjects'][0]->id, 'employee_id' => $teacher->id],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['entries']);

        $this->assertDatabaseMissing('timetable_entries', ['timetable_id' => $timetableB->id]);
    }

    public function test_admin_can_publish_and_unpublish(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $session = $this->makeSession($school);
        $setup = $this->makeClass($school, 'Class 5', 'A', 5);
        $timetable = $this->makeTimetable($school, $session, $setup);

        $this->actingAs($admin)->postJson("/api/v1/timetables/{$timetable->id}/publish")
            ->assertOk()->assertJsonPath('data.status', 'published');
        $this->assertNotNull($timetable->fresh()->published_at);

        $this->actingAs($admin)->postJson("/api/v1/timetables/{$timetable->id}/unpublish")
            ->assertOk()->assertJsonPath('data.status', 'draft');
        $this->assertNull($timetable->fresh()->published_at);
    }

    public function test_teacher_has_readonly_access(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $teacherUser = $this->makeUser($school, 'teacher');
        $otherTeacherUser = $this->makeUser($school, 'teacher');
        $session = $this->makeSession($school);
        $setup = $this->makeClass($school, 'Class 5', 'A', 5);
        $slot = $this->makeSlot($school, 1);
        $employee = $this->makeTeacher($school, $teacherUser);
        $timetable = $this->makeTimetable($school, $session, $setup, 'published');
        TimetableEntry::create([
            'school_id' => $school->id,
            'timetable_id' => $timetable->id,
            'day_of_week' => 1,
            'period_slot_id' => $slot->id,
            'subject_id' => $setup['subjects'][0]->id,
            'employee_id' => $employee->id,
        ]);

        // Teacher cannot create/write (middleware blocks — no timetables.create).
        $this->actingAs($teacherUser)->postJson('/api/v1/timetables', [
            'academic_session_id' => $session->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
        ])->assertStatus(403);

        // Teacher can read their own weekly timetable.
        $this->actingAs($teacherUser)->getJson("/api/v1/timetables/teacher/{$employee->id}")
            ->assertOk()->assertJsonCount(1, 'data.entries');

        // Teacher cannot read someone else's timetable.
        $otherEmployee = $this->makeTeacher($school, $otherTeacherUser);
        $this->actingAs($teacherUser)->getJson("/api/v1/timetables/teacher/{$otherEmployee->id}")
            ->assertStatus(403);
    }

    public function test_timetables_are_tenant_isolated(): void
    {
        $schoolA = $this->makeSchool('Alpha');
        $schoolB = $this->makeSchool('Beta');
        $adminA = $this->makeUser($schoolA, 'school_admin');
        $sessionB = $this->makeSession($schoolB);
        $setupB = $this->makeClass($schoolB, 'Class 5', 'A', 5);
        $timetableB = $this->makeTimetable($schoolB, $sessionB, $setupB);

        // School A admin sees no School B timetables.
        $this->actingAs($adminA)->getJson('/api/v1/timetables')
            ->assertOk()->assertJsonCount(0, 'data');

        // And cannot fetch School B's timetable directly.
        $this->actingAs($adminA)->getJson("/api/v1/timetables/{$timetableB->id}")
            ->assertStatus(404);
    }
}

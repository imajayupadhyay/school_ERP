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

    private function makeSlot(School $school, int $sequence, bool $break = false, ?int $classId = null, ?string $start = null, ?string $end = null): PeriodSlot
    {
        return PeriodSlot::create([
            'school_id' => $school->id,
            'class_id' => $classId,
            'name' => $break ? "Break {$sequence}" : "Period {$sequence}",
            'sequence' => $sequence,
            'start_time' => $start,
            'end_time' => $end,
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

    public function test_period_slot_sequence_is_unique_per_scope(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeClass($school, 'Class 5', 'A', 5);
        $classId = $setup['class']->id;

        // Default slot at sequence 1.
        $this->actingAs($admin)->postJson('/api/v1/period-slots', ['name' => 'P1', 'sequence' => 1])
            ->assertCreated()->assertJsonPath('data.class_id', null);

        // A class override may reuse sequence 1 — different scope.
        $this->actingAs($admin)->postJson('/api/v1/period-slots', ['name' => 'P1', 'sequence' => 1, 'class_id' => $classId])
            ->assertCreated()->assertJsonPath('data.class_id', $classId);

        // But not twice within the same class scope.
        $this->actingAs($admin)->postJson('/api/v1/period-slots', ['name' => 'P1b', 'sequence' => 1, 'class_id' => $classId])
            ->assertStatus(422)->assertJsonValidationErrors(['sequence']);

        // And not twice within the default set (guards MySQL distinct-NULL).
        $this->actingAs($admin)->postJson('/api/v1/period-slots', ['name' => 'P1b', 'sequence' => 1])
            ->assertStatus(422)->assertJsonValidationErrors(['sequence']);
    }

    public function test_class_effective_slots_fall_back_to_default(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeClass($school, 'Class 5', 'A', 5);
        $classId = $setup['class']->id;
        $this->makeSlot($school, 1, false, null, '08:00', '08:45');
        $this->makeSlot($school, 2, false, null, '08:45', '09:30');

        // No override yet → inherits the two default slots.
        $this->actingAs($admin)->getJson("/api/v1/period-slots?class_id={$classId}")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.inherited', true)
            ->assertJsonPath('meta.class_id', $classId);

        // Give the class its own single slot → no longer inherited.
        $this->makeSlot($school, 1, false, $classId, '09:00', '09:50');

        $this->actingAs($admin)->getJson("/api/v1/period-slots?class_id={$classId}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.inherited', false);
    }

    public function test_admin_can_copy_default_schedule_into_a_class(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeClass($school, 'Class 5', 'A', 5);
        $classId = $setup['class']->id;
        $this->makeSlot($school, 1, false, null, '08:00', '08:45');
        $this->makeSlot($school, 2, true, null, '08:45', '09:00');
        $this->makeSlot($school, 3, false, null, '09:00', '09:45');

        $this->actingAs($admin)->postJson("/api/v1/classes/{$classId}/period-slots/copy-default")
            ->assertCreated()->assertJsonCount(3, 'data');

        $this->assertSame(3, PeriodSlot::where('class_id', $classId)->count());
        $this->assertNotNull(AuditLog::where('action', 'period_slot.schedule_copied')->first());

        // Copying again is rejected — the class already has a custom schedule.
        $this->actingAs($admin)->postJson("/api/v1/classes/{$classId}/period-slots/copy-default")
            ->assertStatus(422);
    }

    public function test_admin_can_revert_class_schedule_unless_published(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $session = $this->makeSession($school);
        $setup = $this->makeClass($school, 'Class 5', 'A', 5);
        $classId = $setup['class']->id;
        $override = $this->makeSlot($school, 1, false, $classId, '08:00', '08:45');
        $teacher = $this->makeTeacher($school);
        $timetable = $this->makeTimetable($school, $session, $setup, 'published');
        TimetableEntry::create([
            'school_id' => $school->id,
            'timetable_id' => $timetable->id,
            'day_of_week' => 1,
            'period_slot_id' => $override->id,
            'subject_id' => $setup['subjects'][0]->id,
            'employee_id' => $teacher->id,
        ]);

        // A published timetable references the override → revert is blocked.
        $this->actingAs($admin)->deleteJson("/api/v1/classes/{$classId}/period-slots")
            ->assertStatus(422);
        $this->assertSame(1, PeriodSlot::where('class_id', $classId)->count());

        // Unpublish, then revert succeeds and the class falls back to default.
        $this->actingAs($admin)->postJson("/api/v1/timetables/{$timetable->id}/unpublish")->assertOk();
        $this->actingAs($admin)->deleteJson("/api/v1/classes/{$classId}/period-slots")->assertOk();
        $this->assertSame(0, PeriodSlot::where('class_id', $classId)->count());
        $this->assertNotNull(AuditLog::where('action', 'period_slot.schedule_reverted')->first());
    }

    public function test_overlapping_period_times_block_teacher_across_classes(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $session = $this->makeSession($school);
        $setupA = $this->makeClass($school, 'Class 5', 'A', 5);
        $setupB = $this->makeClass($school, 'Class 6', 'B', 6);
        // Class A uses the default schedule; Class B has its own overlapping slot.
        $defaultSlot = $this->makeSlot($school, 1, false, null, '12:00', '12:40');
        $overrideSlot = $this->makeSlot($school, 1, false, $setupB['class']->id, '12:20', '13:00');
        $teacher = $this->makeTeacher($school);

        $timetableA = $this->makeTimetable($school, $session, $setupA);
        $timetableB = $this->makeTimetable($school, $session, $setupB);

        $this->actingAs($admin)->putJson("/api/v1/timetables/{$timetableA->id}/entries", [
            'entries' => [
                ['day_of_week' => 1, 'period_slot_id' => $defaultSlot->id, 'subject_id' => $setupA['subjects'][0]->id, 'employee_id' => $teacher->id],
            ],
        ])->assertOk();

        // 12:20–13:00 overlaps 12:00–12:40 → blocked even though slots differ.
        $this->actingAs($admin)->putJson("/api/v1/timetables/{$timetableB->id}/entries", [
            'entries' => [
                ['day_of_week' => 1, 'period_slot_id' => $overrideSlot->id, 'subject_id' => $setupB['subjects'][0]->id, 'employee_id' => $teacher->id],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['entries']);

        $this->assertDatabaseMissing('timetable_entries', ['timetable_id' => $timetableB->id]);
    }

    public function test_adjacent_period_times_do_not_clash(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $session = $this->makeSession($school);
        $setupA = $this->makeClass($school, 'Class 5', 'A', 5);
        $setupB = $this->makeClass($school, 'Class 6', 'B', 6);
        $defaultSlot = $this->makeSlot($school, 1, false, null, '08:00', '08:45');
        $overrideSlot = $this->makeSlot($school, 1, false, $setupB['class']->id, '08:45', '09:30');
        $teacher = $this->makeTeacher($school);

        $timetableA = $this->makeTimetable($school, $session, $setupA);
        $timetableB = $this->makeTimetable($school, $session, $setupB);

        $this->actingAs($admin)->putJson("/api/v1/timetables/{$timetableA->id}/entries", [
            'entries' => [
                ['day_of_week' => 1, 'period_slot_id' => $defaultSlot->id, 'subject_id' => $setupA['subjects'][0]->id, 'employee_id' => $teacher->id],
            ],
        ])->assertOk();

        // 08:45–09:30 starts exactly when 08:00–08:45 ends → no overlap, allowed.
        $this->actingAs($admin)->putJson("/api/v1/timetables/{$timetableB->id}/entries", [
            'entries' => [
                ['day_of_week' => 1, 'period_slot_id' => $overrideSlot->id, 'subject_id' => $setupB['subjects'][0]->id, 'employee_id' => $teacher->id],
            ],
        ])->assertOk()->assertJsonCount(1, 'data.entries');
    }

    public function test_entry_rejects_slot_outside_class_schedule(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $session = $this->makeSession($school);
        $setupA = $this->makeClass($school, 'Class 5', 'A', 5);
        $setupB = $this->makeClass($school, 'Class 6', 'B', 6);
        // A slot that belongs only to Class B's override schedule.
        $foreignSlot = $this->makeSlot($school, 1, false, $setupB['class']->id, '08:00', '08:45');
        $teacher = $this->makeTeacher($school);
        $timetableA = $this->makeTimetable($school, $session, $setupA);

        // Class A (default schedule) cannot use Class B's override slot.
        $this->actingAs($admin)->putJson("/api/v1/timetables/{$timetableA->id}/entries", [
            'entries' => [
                ['day_of_week' => 1, 'period_slot_id' => $foreignSlot->id, 'subject_id' => $setupA['subjects'][0]->id, 'employee_id' => $teacher->id],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['entries.0.period_slot_id']);
    }

    public function test_class_schedule_endpoints_are_tenant_isolated(): void
    {
        $schoolA = $this->makeSchool('Alpha');
        $schoolB = $this->makeSchool('Beta');
        $adminA = $this->makeUser($schoolA, 'school_admin');
        $setupB = $this->makeClass($schoolB, 'Class 5', 'A', 5);

        // School A admin cannot copy/revert a schedule on School B's class.
        $this->actingAs($adminA)->postJson("/api/v1/classes/{$setupB['class']->id}/period-slots/copy-default")
            ->assertStatus(404);
        $this->actingAs($adminA)->deleteJson("/api/v1/classes/{$setupB['class']->id}/period-slots")
            ->assertStatus(404);
    }
}

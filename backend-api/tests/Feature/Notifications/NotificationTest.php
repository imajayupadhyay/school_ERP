<?php

namespace Tests\Feature\Notifications;

use App\Models\AuditLog;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(string $code = 'Demo'): School
    {
        return School::create(['name' => "{$code} School", 'code' => $code]);
    }

    private function makeUser(School $school, string $role = 'school_admin'): User
    {
        return User::factory()->create(['school_id' => $school->id, 'role' => $role, 'status' => 'active']);
    }

    private function makeLog(School $school, string $action, ?User $actor = null): AuditLog
    {
        return AuditLog::create([
            'school_id' => $school->id,
            'user_id' => $actor?->id,
            'action' => $action,
            'changes' => [],
        ]);
    }

    public function test_feed_shows_others_events_and_excludes_own_and_unlisted(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school);
        $reception = $this->makeUser($school, 'receptionist');

        $this->makeLog($school, 'student.created', $reception);     // notifiable, someone else
        $this->makeLog($school, 'fee_payment.collected', $reception); // notifiable
        $this->makeLog($school, 'student.created', $admin);          // own action → excluded
        $this->makeLog($school, 'student.updated', $reception);      // not in registry → ignored

        $res = $this->actingAs($admin)->getJson('/api/v1/notifications')->assertOk();

        $res->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.unread_count', 2);

        $actions = collect($res->json('data'))->pluck('action')->all();
        $this->assertContains('student.created', $actions);
        $this->assertContains('fee_payment.collected', $actions);
        $this->assertNotContains('student.updated', $actions);
    }

    public function test_feed_is_permission_filtered(): void
    {
        $school = $this->makeSchool();
        $accountant = $this->makeUser($school, 'accountant'); // fees.* + students.view, NOT exams/notices
        $other = $this->makeUser($school, 'school_admin');

        $this->makeLog($school, 'fee_payment.collected', $other); // accountant CAN see
        $this->makeLog($school, 'exam_results.published', $other); // accountant CANNOT see
        $this->makeLog($school, 'notice.created', $other);         // accountant CANNOT see

        $res = $this->actingAs($accountant)->getJson('/api/v1/notifications')->assertOk();

        $res->assertJsonCount(1, 'data')->assertJsonPath('meta.unread_count', 1);
        $this->assertSame('fee_payment.collected', $res->json('data.0.action'));
    }

    public function test_unread_count_respects_seen_watermark(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school);
        $other = $this->makeUser($school, 'receptionist');

        $this->makeLog($school, 'student.created', $other);

        $this->actingAs($admin)->getJson('/api/v1/notifications/unread-count')
            ->assertOk()->assertJsonPath('data.count', 1);

        // Mark everything seen → badge clears.
        $this->actingAs($admin)->postJson('/api/v1/notifications/seen')->assertOk();
        $this->assertNotNull($admin->fresh()->notifications_seen_at);

        $this->actingAs($admin)->getJson('/api/v1/notifications/unread-count')
            ->assertOk()->assertJsonPath('data.count', 0);

        // A new event after the watermark counts as unread again.
        $this->travel(1)->minute();
        $this->makeLog($school, 'fee_payment.collected', $other);

        $this->actingAs($admin)->getJson('/api/v1/notifications/unread-count')
            ->assertOk()->assertJsonPath('data.count', 1);
    }

    public function test_seen_marks_existing_items_read_in_feed(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school);
        $other = $this->makeUser($school, 'receptionist');
        $this->makeLog($school, 'student.created', $other);

        $this->actingAs($admin)->postJson('/api/v1/notifications/seen')->assertOk();

        $this->actingAs($admin)->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('meta.unread_count', 0)
            ->assertJsonPath('data.0.read', true);
    }

    public function test_notifications_are_tenant_isolated(): void
    {
        $schoolA = $this->makeSchool('Alpha');
        $schoolB = $this->makeSchool('Beta');
        $adminA = $this->makeUser($schoolA);
        $otherB = $this->makeUser($schoolB, 'receptionist');

        $this->makeLog($schoolB, 'student.created', $otherB);

        $this->actingAs($adminA)->getJson('/api/v1/notifications')
            ->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.unread_count', 0);
    }
}

<?php

namespace Tests\Feature\Platform;

use App\Models\Enquiry;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnquiryTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        return User::factory()->create([
            'school_id' => null,
            'email' => 'owner@schoollid.test',
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    public function test_public_can_submit_an_enquiry(): void
    {
        $this->postJson('/api/v1/enquiries', [
            'name' => 'Anita Rao',
            'email' => 'anita@example.com',
            'phone' => '+919876543210',
        ])->assertCreated();

        $this->assertDatabaseHas('enquiries', [
            'email' => 'anita@example.com',
            'status' => 'new',
        ]);
    }

    public function test_enquiry_submission_validates_required_fields(): void
    {
        $this->postJson('/api/v1/enquiries', ['name' => 'X'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'phone']);
    }

    public function test_platform_admin_can_list_filter_and_update_enquiries(): void
    {
        $admin = $this->superAdmin();
        $a = Enquiry::create(['name' => 'Lead A', 'email' => 'a@x.com', 'phone' => '111', 'status' => 'new']);
        Enquiry::create(['name' => 'Lead B', 'email' => 'b@x.com', 'phone' => '222', 'status' => 'contacted']);

        $this->actingAs($admin)->getJson('/api/v1/platform/enquiries')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 2)
            ->assertJsonPath('data.meta.new_count', 1);

        $this->actingAs($admin)->getJson('/api/v1/platform/enquiries?search=Lead A')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1);

        $this->actingAs($admin)->postJson("/api/v1/platform/enquiries/{$a->id}/status", ['status' => 'converted'])
            ->assertOk()
            ->assertJsonPath('data.status', 'converted');

        $this->assertDatabaseHas('audit_logs', ['school_id' => null, 'action' => 'enquiry.status_changed']);
    }

    public function test_platform_admin_can_delete_an_enquiry(): void
    {
        $admin = $this->superAdmin();
        $e = Enquiry::create(['name' => 'Lead', 'email' => 'l@x.com', 'phone' => '333', 'status' => 'new']);

        $this->actingAs($admin)->deleteJson("/api/v1/platform/enquiries/{$e->id}")->assertOk();
        $this->assertDatabaseMissing('enquiries', ['id' => $e->id]);
    }

    public function test_school_user_cannot_access_platform_enquiries(): void
    {
        $school = School::create(['name' => 'T', 'code' => 'T1', 'status' => 'active']);
        $user = User::factory()->create(['school_id' => $school->id, 'role' => 'school_admin', 'status' => 'active']);

        $this->actingAs($user)->getJson('/api/v1/platform/enquiries')->assertStatus(403);
    }
}

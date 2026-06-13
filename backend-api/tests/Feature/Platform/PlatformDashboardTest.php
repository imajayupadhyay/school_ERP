<?php

namespace Tests\Feature\Platform;

use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(string $code, string $status = 'active'): School
    {
        return School::create(['name' => "{$code} School", 'code' => $code, 'status' => $status, 'city' => 'Metro']);
    }

    private function superAdmin(): User
    {
        return User::factory()->create([
            'school_id' => null,
            'name' => 'Platform Owner',
            'email' => 'owner@schoollid.test',
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    public function test_super_admin_can_log_in_via_platform_endpoint(): void
    {
        $admin = $this->superAdmin();
        $admin->forceFill(['password' => bcrypt('Secret@123')])->save();

        $response = $this->postJson('/api/v1/platform/auth/login', [
            'email' => 'owner@schoollid.test',
            'password' => 'Secret@123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.role', 'super_admin')
            ->assertJsonPath('data.user.is_owner', true)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'email', 'permissions']]]);
    }

    public function test_platform_login_rejects_wrong_password(): void
    {
        $admin = $this->superAdmin();
        $admin->forceFill(['password' => bcrypt('Secret@123')])->save();

        $this->postJson('/api/v1/platform/auth/login', [
            'email' => 'owner@schoollid.test',
            'password' => 'wrong',
        ])->assertStatus(422);
    }

    public function test_school_user_cannot_log_in_via_platform_endpoint(): void
    {
        $school = $this->makeSchool('Alpha');
        $user = User::factory()->create([
            'school_id' => $school->id,
            'email' => 'admin@alpha.test',
            'role' => 'school_admin',
            'status' => 'active',
        ]);
        $user->forceFill(['password' => bcrypt('Secret@123')])->save();

        // Same email exists only as a school user → platform login must reject.
        $this->postJson('/api/v1/platform/auth/login', [
            'email' => 'admin@alpha.test',
            'password' => 'Secret@123',
        ])->assertStatus(422);
    }

    public function test_school_user_token_cannot_reach_platform_dashboard(): void
    {
        $school = $this->makeSchool('Alpha');
        $user = User::factory()->create([
            'school_id' => $school->id,
            'role' => 'school_admin',
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/platform/dashboard')
            ->assertStatus(403);
    }

    public function test_dashboard_aggregates_across_all_schools(): void
    {
        $alpha = $this->makeSchool('Alpha');
        $beta = $this->makeSchool('Beta', 'suspended');

        Student::create(['school_id' => $alpha->id, 'first_name' => 'A1']);
        Student::create(['school_id' => $alpha->id, 'first_name' => 'A2']);
        Student::create(['school_id' => $beta->id, 'first_name' => 'B1']);

        $admin = $this->superAdmin();

        $response = $this->actingAs($admin)->getJson('/api/v1/platform/dashboard');

        $response->assertOk()
            ->assertJsonPath('data.totals.schools', 2)
            ->assertJsonPath('data.totals.active_schools', 1)
            ->assertJsonPath('data.totals.inactive_schools', 1)
            ->assertJsonPath('data.totals.students', 3);

        $this->assertCount(2, $response->json('data.recent_schools'));
        $this->assertSame(6, count($response->json('data.growth_trend')));
    }
}

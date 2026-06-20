<?php

namespace Tests\Feature;

use App\Organizations\Models\Organization;
use App\Scheduling\Models\Schedule;
use App\ShiftTemplates\Enums\RecurrenceFrequency;
use App\ShiftTemplates\Models\ShiftTemplate;
use App\Teams\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShiftTemplateTeamTest extends TestCase
{
    use RefreshDatabase;

    public function test_global_template_applies_to_every_team_until_scoped(): void
    {
        $org = Organization::factory()->create();
        $this->actingAsOwner($org);
        $teamA = Team::factory()->create(['organization_id' => $org->id]);
        $teamB = Team::factory()->create(['organization_id' => $org->id]);
        $template = ShiftTemplate::factory()->create(['organization_id' => $org->id]);

        // No scope yet -> applies to both teams.
        $this->assertCount(1, $this->getJson("teams/{$teamA->id}/shift-templates")->json('data'));
        $this->assertCount(1, $this->getJson("teams/{$teamB->id}/shift-templates")->json('data'));

        // Attaching to A scopes it to A only.
        $this->putJson("teams/{$teamA->id}/shift-templates/{$template->id}")
            ->assertOk()
            ->assertJsonPath('data.teamIds', [$teamA->id]);

        $this->assertCount(1, $this->getJson("teams/{$teamA->id}/shift-templates")->json('data'));
        $this->assertCount(0, $this->getJson("teams/{$teamB->id}/shift-templates")->json('data'));

        // Detaching makes it global again.
        $this->deleteJson("teams/{$teamA->id}/shift-templates/{$template->id}")->assertOk();
        $this->assertCount(1, $this->getJson("teams/{$teamB->id}/shift-templates")->json('data'));
    }

    public function test_attaching_a_template_across_orgs_is_rejected(): void
    {
        $templateOrg = Organization::factory()->create();
        $template = ShiftTemplate::factory()->create(['organization_id' => $templateOrg->id]);
        $foreignOrg = Organization::factory()->create();
        $foreignTeam = Team::factory()->create(['organization_id' => $foreignOrg->id]);
        $this->actingAsOwner($foreignOrg);

        $this->putJson("teams/{$foreignTeam->id}/shift-templates/{$template->id}")->assertStatus(422);
    }

    public function test_regenerate_pulls_templates_into_an_existing_schedule(): void
    {
        $org = Organization::factory()->create();
        $this->actingAsOwner($org);
        $team = Team::factory()->create(['organization_id' => $org->id]);
        // Schedule created (factory) before any template exists -> no shifts.
        $schedule = Schedule::factory()->create([
            'team_id' => $team->id,
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-21',
        ]);
        ShiftTemplate::factory()->create([
            'organization_id' => $org->id,
            'recurrence_frequency' => RecurrenceFrequency::Weekly,
            'recurrence_days' => [1, 2, 3, 4, 5, 6, 7],
        ]);

        $this->postJson("schedules/{$schedule->id}/shifts/generate")->assertOk();

        // 7 days in the period, recurring every day -> 7 generated shifts.
        $this->assertCount(7, $this->getJson("schedules/{$schedule->id}/shifts")->json('data'));
    }
}

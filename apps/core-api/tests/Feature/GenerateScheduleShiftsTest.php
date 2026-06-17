<?php

namespace Tests\Feature;

use App\Organizations\Models\Organization;
use App\Scheduling\Actions\GenerateScheduleShifts;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use App\ShiftTemplates\Enums\RecurrenceFrequency;
use App\ShiftTemplates\Enums\RequirementType;
use App\ShiftTemplates\Models\ShiftTemplate;
use App\ShiftTemplates\Models\ShiftTemplateRequirement;
use App\Skills\Models\Skill;
use App\Teams\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GenerateScheduleShiftsTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    private Team $team;

    private Schedule $schedule; // 2026-06-15 (Mon) .. 2026-06-21 (Sun)

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->team = Team::factory()->create(['organization_id' => $this->org->id]);
        $this->schedule = Schedule::factory()->create([
            'team_id' => $this->team->id,
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-21',
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function template(array $attributes = []): ShiftTemplate
    {
        return ShiftTemplate::factory()->create([
            'organization_id' => $this->org->id,
            ...$attributes,
        ]);
    }

    private function generate(): void
    {
        app(GenerateScheduleShifts::class)->handle($this->schedule);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, ScheduledShift>
     */
    private function shifts()
    {
        return (new ScheduledShift)->newQuery()
            ->where('schedule_id', $this->schedule->id)
            ->orderBy('start_at')
            ->get();
    }

    public function test_weekly_template_expands_only_on_matching_iso_weekdays(): void
    {
        $this->template([
            'recurrence_frequency' => RecurrenceFrequency::Weekly,
            'recurrence_days' => [1, 3, 5], // Mon, Wed, Fri
        ]);

        $this->generate();

        $this->assertSame(
            ['2026-06-15', '2026-06-17', '2026-06-19'],
            $this->shifts()->map(fn ($s) => $s->start_at->toDateString())->all(),
        );
    }

    public function test_monthly_template_expands_only_on_matching_day_of_month(): void
    {
        $this->template([
            'recurrence_frequency' => RecurrenceFrequency::Monthly,
            'recurrence_days' => [15, 20, 28], // 28 is outside the period
        ]);

        $this->generate();

        $this->assertSame(
            ['2026-06-15', '2026-06-20'],
            $this->shifts()->map(fn ($s) => $s->start_at->toDateString())->all(),
        );
    }

    public function test_non_recurring_templates_are_skipped(): void
    {
        $this->template(['recurrence_frequency' => null, 'recurrence_days' => null]);

        $this->generate();

        $this->assertCount(0, $this->shifts());
    }

    public function test_only_org_templates_scoped_to_this_team_or_shared_are_used(): void
    {
        $shared = $this->template(['recurrence_days' => [1]]); // no team scope = all teams
        $mine = $this->template(['recurrence_days' => [1]]);
        $mine->teams()->attach($this->team->id);

        $otherTeam = Team::factory()->create(['organization_id' => $this->org->id]);
        $this->template(['recurrence_days' => [1]])->teams()->attach($otherTeam->id);

        // A template in a different organization entirely.
        $otherOrg = Organization::factory()->create();
        ShiftTemplate::factory()->create(['organization_id' => $otherOrg->id, 'recurrence_days' => [1]]);

        $this->generate();

        $this->assertEqualsCanonicalizing(
            [$shared->id, $mine->id],
            $this->shifts()->pluck('shift_template_id')->all(),
        );
    }

    public function test_regeneration_replaces_generated_shifts_but_keeps_manual_ones(): void
    {
        // A manual (non-template) shift the manager added directly.
        $manual = ScheduledShift::factory()->create(['schedule_id' => $this->schedule->id]);

        $this->template(['recurrence_days' => [1]]); // Mondays in the period
        $this->generate();
        $firstGenerated = $this->shifts()->firstWhere('shift_template_id', '!=', null);
        $this->assertNotNull($firstGenerated);

        // Re-running regenerates template shifts (new ids) and keeps the manual one.
        $this->generate();
        $ids = $this->shifts()->pluck('id');
        $this->assertTrue($ids->contains($manual->id));
        $this->assertFalse($ids->contains($firstGenerated->id));
    }

    public function test_overnight_shift_ends_on_the_next_day(): void
    {
        $this->template([
            'start_time' => '22:00:00',
            'end_time' => '06:00:00',
            'recurrence_days' => [1], // Monday only
        ]);

        $this->generate();

        $shift = $this->shifts()->sole();
        $this->assertSame('2026-06-15 22:00:00', $shift->start_at->toDateTimeString());
        $this->assertSame('2026-06-16 06:00:00', $shift->end_at->toDateTimeString());
    }

    public function test_day_scoped_headcount_is_summed_per_day(): void
    {
        // Base Cook x2 every day + Cook x1 only on Mon/Fri (a shipment surge).
        $template = $this->template(['recurrence_days' => [1, 2, 5]]); // Mon, Tue, Fri
        $cook = Skill::factory()->create(['organization_id' => $this->org->id]);

        ShiftTemplateRequirement::factory()->create([
            'shift_template_id' => $template->id,
            'skill_id' => $cook->id,
            'type' => RequirementType::Headcount,
            'count' => 2,
            'days' => null, // every day the shift runs
        ]);
        ShiftTemplateRequirement::factory()->create([
            'shift_template_id' => $template->id,
            'skill_id' => $cook->id,
            'type' => RequirementType::Headcount,
            'count' => 1,
            'days' => [1, 5], // Mon, Fri only
        ]);

        $this->generate();

        $byDate = $this->shifts()->keyBy(fn ($s) => $s->start_at->toDateString());
        $this->assertSame(3, $byDate['2026-06-15']->requirements()->sum('count')); // Mon: 2+1
        $this->assertSame(2, $byDate['2026-06-16']->requirements()->sum('count')); // Tue: 2
        $this->assertSame(3, $byDate['2026-06-19']->requirements()->sum('count')); // Fri: 2+1

        // One headcount line per skill per day (summed, not duplicated).
        $this->assertSame(1, $byDate['2026-06-15']->requirements()->count());
    }

    public function test_coverage_requirements_are_deduplicated_per_skill(): void
    {
        $template = $this->template(['recurrence_days' => [1]]);
        $cook = Skill::factory()->create(['organization_id' => $this->org->id]);

        // Two coverage lines for the same skill collapse to one; no headcount added.
        foreach ([null, [1]] as $days) {
            ShiftTemplateRequirement::factory()->create([
                'shift_template_id' => $template->id,
                'skill_id' => $cook->id,
                'type' => RequirementType::Coverage,
                'count' => null,
                'days' => $days,
            ]);
        }

        $this->generate();

        $requirements = $this->shifts()->sole()->requirements()->get();
        $this->assertCount(1, $requirements);
        $this->assertSame(RequirementType::Coverage, $requirements->first()->type);
        $this->assertNull($requirements->first()->count);
    }

    public function test_shift_snapshots_template_fields(): void
    {
        $this->template([
            'name' => 'Night Cook',
            'category' => 'night',
            'rest_hours_after' => 11,
            'recurrence_days' => [1],
        ]);

        $this->generate();

        $shift = $this->shifts()->sole();
        $this->assertSame('Night Cook', $shift->name);
        $this->assertSame('night', $shift->category);
        $this->assertSame(11, $shift->rest_hours_after);
    }
}

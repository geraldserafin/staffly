<?php

namespace Tests\Feature;

use App\Availability\Enums\AvailabilityKind;
use App\Availability\Enums\AvailabilityRecurrence;
use App\Availability\Models\Availability;
use App\Availability\Services\MemberAvailabilityResolver;
use App\Members\Models\Member;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberAvailabilityResolverTest extends TestCase
{
    use RefreshDatabase;

    private MemberAvailabilityResolver $resolver;

    private Member $member;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resolver = new MemberAvailabilityResolver;
        $this->member = Member::factory()->create();
        $this->actingAsOwner($this->member->organization);
    }

    // 2026-06-15 is a Monday → 20 = Sat, 21 = Sun.
    private function shift(string $start, string $end): bool
    {
        return $this->resolver->isAvailable($this->member, Carbon::parse($start), Carbon::parse($end));
    }

    public function test_no_entries_means_available(): void
    {
        $this->assertTrue($this->shift('2026-06-15 09:00', '2026-06-15 17:00'));
    }

    public function test_one_off_time_off_blocks_overlapping_shift(): void
    {
        Availability::factory()->create([
            'member_id' => $this->member->id,
            'kind' => AvailabilityKind::Unavailable,
            'recurrence' => null,
            'start_at' => '2026-06-20 00:00:00',
            'end_at' => '2026-06-25 23:59:00',
        ]);

        $this->assertFalse($this->shift('2026-06-20 09:00', '2026-06-20 17:00'));
        $this->assertTrue($this->shift('2026-06-26 09:00', '2026-06-26 17:00'));
    }

    public function test_weekly_available_is_an_allowlist(): void
    {
        // Available only weekends, 13:00–02:00 (overnight).
        Availability::factory()->create([
            'member_id' => $this->member->id,
            'kind' => AvailabilityKind::Available,
            'recurrence' => AvailabilityRecurrence::Weekly,
            'days' => [6, 7],
            'start_time' => '13:00:00',
            'end_time' => '02:00:00',
            'start_at' => null,
            'end_at' => null,
        ]);

        $this->assertTrue($this->shift('2026-06-20 14:00', '2026-06-20 18:00'));  // Sat, inside
        $this->assertFalse($this->shift('2026-06-15 14:00', '2026-06-15 18:00')); // Mon, not allowed
    }

    public function test_overnight_available_window_covers_next_morning(): void
    {
        Availability::factory()->create([
            'member_id' => $this->member->id,
            'kind' => AvailabilityKind::Available,
            'recurrence' => AvailabilityRecurrence::Weekly,
            'days' => [6], // Saturday window spills into Sunday
            'start_time' => '22:00:00',
            'end_time' => '06:00:00',
            'start_at' => null,
            'end_at' => null,
        ]);

        $this->assertTrue($this->shift('2026-06-21 02:00', '2026-06-21 04:00')); // Sun early morning
    }

    public function test_time_off_overrides_recurring_availability(): void
    {
        Availability::factory()->create([
            'member_id' => $this->member->id,
            'kind' => AvailabilityKind::Available,
            'recurrence' => AvailabilityRecurrence::Weekly,
            'days' => [6, 7],
            'start_time' => null,
            'end_time' => null,
            'start_at' => null,
            'end_at' => null,
        ]);
        Availability::factory()->create([
            'member_id' => $this->member->id,
            'kind' => AvailabilityKind::Unavailable,
            'recurrence' => null,
            'start_at' => '2026-06-20 12:00:00',
            'end_at' => '2026-06-20 20:00:00',
        ]);

        $this->assertFalse($this->shift('2026-06-20 14:00', '2026-06-20 18:00')); // time off wins
        $this->assertTrue($this->shift('2026-06-20 08:00', '2026-06-20 11:00'));  // available, outside time off
    }
}

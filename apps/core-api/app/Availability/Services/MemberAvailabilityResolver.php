<?php

namespace App\Availability\Services;

use App\Availability\Enums\AvailabilityKind;
use App\Availability\Enums\AvailabilityRecurrence;
use App\Availability\Models\Availability;
use App\Members\Models\Member;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

/**
 * Resolves whether a member can work a concrete shift interval, given their
 * standing availability (recurring weekly windows + one-off spans).
 *
 * Rules:
 *  - time-off (unavailable) overlapping the shift  -> not available (always wins);
 *  - if the member has any positive (available) rules, the shift must fall fully
 *    within one of them (allowlist); otherwise the member is available by default.
 *  - overnight windows (end < start) spill into the next day.
 */
class MemberAvailabilityResolver
{
    public function isAvailable(Member $member, CarbonInterface $start, CarbonInterface $end): bool
    {
        $entries = $this->entriesFor($member);

        // Scan window: from the day before the shift starts (to catch overnight
        // windows anchored on the previous day) through the day it ends.
        $from = $start->copy()->subDay()->startOfDay();
        $to = $end->copy()->startOfDay();

        $unavailable = $entries->where('kind', AvailabilityKind::Unavailable);
        foreach ($unavailable as $entry) {
            foreach ($this->intervals($entry, $from, $to) as [$windowStart, $windowEnd]) {
                if ($this->overlaps($windowStart, $windowEnd, $start, $end)) {
                    return false;
                }
            }
        }

        $available = $entries->where('kind', AvailabilityKind::Available);
        if ($available->isEmpty()) {
            return true;
        }

        foreach ($available as $entry) {
            foreach ($this->intervals($entry, $from, $to) as [$windowStart, $windowEnd]) {
                if ($this->contains($windowStart, $windowEnd, $start, $end)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @return Collection<int, Availability>
     */
    private function entriesFor(Member $member): Collection
    {
        return (new Availability)->newQuery()
            ->where('member_id', $member->getKey())
            ->get();
    }

    /**
     * Concrete [start, end] intervals an entry produces within [from, to].
     *
     * @return list<array{0: Carbon, 1: Carbon}>
     */
    private function intervals(Availability $entry, Carbon $from, Carbon $to): array
    {
        if ($entry->recurrence === AvailabilityRecurrence::Weekly) {
            return $this->weeklyIntervals($entry, $from, $to);
        }

        if ($entry->start_at && $entry->end_at) {
            return [[$entry->start_at->copy(), $entry->end_at->copy()]];
        }

        return [];
    }

    /**
     * @return list<array{0: Carbon, 1: Carbon}>
     */
    private function weeklyIntervals(Availability $entry, Carbon $from, Carbon $to): array
    {
        $days = $entry->days ?? [];
        $intervals = [];

        foreach (CarbonPeriod::create($from, $to) as $date) {
            if (! in_array($date->dayOfWeekIso, $days, true)) {
                continue;
            }

            if ($entry->start_time === null || $entry->end_time === null) {
                // All-day availability for that weekday.
                $intervals[] = [$date->copy()->startOfDay(), $date->copy()->addDay()->startOfDay()];

                continue;
            }

            $windowStart = $date->copy()->setTimeFromTimeString($entry->start_time);
            $windowEnd = $date->copy()->setTimeFromTimeString($entry->end_time);
            if ($windowEnd->lessThanOrEqualTo($windowStart)) {
                $windowEnd->addDay(); // overnight
            }

            $intervals[] = [$windowStart, $windowEnd];
        }

        return $intervals;
    }

    private function overlaps(CarbonInterface $aStart, CarbonInterface $aEnd, CarbonInterface $bStart, CarbonInterface $bEnd): bool
    {
        return $aStart->lessThan($bEnd) && $aEnd->greaterThan($bStart);
    }

    private function contains(CarbonInterface $outerStart, CarbonInterface $outerEnd, CarbonInterface $innerStart, CarbonInterface $innerEnd): bool
    {
        return $outerStart->lessThanOrEqualTo($innerStart) && $outerEnd->greaterThanOrEqualTo($innerEnd);
    }
}

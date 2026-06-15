<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use App\ShiftTemplates\Enums\RecurrenceFrequency;
use App\ShiftTemplates\Enums\RequirementType;
use App\ShiftTemplates\Models\ShiftTemplate;
use App\ShiftTemplates\Models\ShiftTemplateRequirement;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;

class GenerateScheduleShifts
{
    /**
     * Expand the team's recurring templates across the schedule period into
     * concrete shifts, snapshotting each template's requirements.
     */
    public function handle(Schedule $schedule): void
    {
        $team = $schedule->team;

        $templates = (new ShiftTemplate)->newQuery()
            ->where('organization_id', $team->organization_id)
            ->whereNotNull('recurrence_frequency')
            ->with('requirements')
            ->get()
            ->filter(fn (ShiftTemplate $template) => $template->team_id === null || $template->team_id === $team->getKey());

        $days = CarbonPeriod::create($schedule->start_date, $schedule->end_date);

        DB::transaction(function () use ($schedule, $templates, $days): void {
            foreach ($days as $date) {
                foreach ($templates as $template) {
                    if (! $this->occursOn($template, $date->dayOfWeekIso, $date->day)) {
                        continue;
                    }

                    $startAt = $date->copy()->setTimeFromTimeString($template->start_time);
                    $endAt = $date->copy()->setTimeFromTimeString($template->end_time);

                    // end <= start means the shift runs past midnight into the next day.
                    if ($endAt->lessThanOrEqualTo($startAt)) {
                        $endAt->addDay();
                    }

                    $shift = new ScheduledShift([
                        'name' => $template->name,
                        'category' => $template->category,
                        'start_at' => $startAt,
                        'end_at' => $endAt,
                        'rest_hours_after' => $template->rest_hours_after,
                    ]);
                    $shift->schedule()->associate($schedule);
                    $shift->template()->associate($template);
                    $shift->save();

                    foreach ($this->netRequirements($template->requirements, $date->dayOfWeekIso) as $requirement) {
                        $shift->requirements()->create($requirement);
                    }
                }
            }
        });
    }

    /**
     * Collapse a template's requirement lines into the net demand for one day:
     * day-scoped lines that match are included, headcount summed per skill,
     * coverage de-duplicated per skill.
     *
     * @param  iterable<ShiftTemplateRequirement>  $requirements
     * @return list<array<string, mixed>>
     */
    private function netRequirements(iterable $requirements, int $isoWeekday): array
    {
        $headcounts = []; // skill key => summed count
        $coverages = [];  // skill key => true

        foreach ($requirements as $requirement) {
            $days = $requirement->days;
            if ($days !== null && ! in_array($isoWeekday, $days, true)) {
                continue;
            }

            $skillKey = $requirement->skill_id ?? '';

            if ($requirement->type === RequirementType::Headcount) {
                $headcounts[$skillKey] = ($headcounts[$skillKey] ?? 0) + (int) $requirement->count;
            } else {
                $coverages[$skillKey] = true;
            }
        }

        $lines = [];

        foreach ($headcounts as $skillKey => $count) {
            $lines[] = [
                'type' => RequirementType::Headcount,
                'count' => $count,
                'skill_id' => $skillKey === '' ? null : $skillKey,
            ];
        }

        foreach (array_keys($coverages) as $skillKey) {
            $lines[] = [
                'type' => RequirementType::Coverage,
                'count' => null,
                'skill_id' => $skillKey === '' ? null : $skillKey,
            ];
        }

        return $lines;
    }

    private function occursOn(ShiftTemplate $template, int $isoWeekday, int $dayOfMonth): bool
    {
        $days = $template->recurrence_days ?? [];

        return match ($template->recurrence_frequency) {
            RecurrenceFrequency::Weekly => in_array($isoWeekday, $days, true),
            RecurrenceFrequency::Monthly => in_array($dayOfMonth, $days, true),
            default => false,
        };
    }
}

<?php

namespace App\Scheduling\Factories;

use App\Scheduling\Enums\ScheduleStatus;
use App\Scheduling\Models\Schedule;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Schedule>
 */
class ScheduleFactory extends Factory
{
    protected $model = Schedule::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'name' => fake()->words(2, true),
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-21',
            'status' => ScheduleStatus::Draft,
            'weights' => null,
        ];
    }
}

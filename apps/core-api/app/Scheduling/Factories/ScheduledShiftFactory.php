<?php

namespace App\Scheduling\Factories;

use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScheduledShift>
 */
class ScheduledShiftFactory extends Factory
{
    protected $model = ScheduledShift::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'schedule_id' => Schedule::factory(),
            'shift_template_id' => null,
            'name' => fake()->randomElement(['Morning', 'Evening']),
            'start_at' => '2026-06-15 09:00:00',
            'end_at' => '2026-06-15 17:00:00',
        ];
    }
}

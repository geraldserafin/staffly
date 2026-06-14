<?php

namespace App\Scheduling\Factories;

use App\Members\Models\Member;
use App\Scheduling\Models\ScheduledShift;
use App\Scheduling\Models\ShiftAssignment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShiftAssignment>
 */
class ShiftAssignmentFactory extends Factory
{
    protected $model = ShiftAssignment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'scheduled_shift_id' => ScheduledShift::factory(),
            'member_id' => Member::factory(),
            'locked' => false,
        ];
    }
}

<?php

namespace App\Scheduling\Factories;

use App\Scheduling\Models\ScheduledShift;
use App\Scheduling\Models\ShiftRequirement;
use App\ShiftTemplates\Enums\RequirementType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShiftRequirement>
 */
class ShiftRequirementFactory extends Factory
{
    protected $model = ShiftRequirement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'scheduled_shift_id' => ScheduledShift::factory(),
            'skill_id' => null,
            'type' => RequirementType::Headcount,
            'count' => 1,
        ];
    }
}

<?php

namespace App\ShiftTemplates\Factories;

use App\Organizations\Models\Organization;
use App\ShiftTemplates\Enums\RecurrenceFrequency;
use App\ShiftTemplates\Models\ShiftTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShiftTemplate>
 */
class ShiftTemplateFactory extends Factory
{
    protected $model = ShiftTemplate::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'team_id' => null,
            'name' => fake()->randomElement(['Morning', 'Afternoon', 'Evening', 'Night']),
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'recurrence_frequency' => RecurrenceFrequency::Weekly,
            'recurrence_days' => [1, 2, 3, 4, 5],
        ];
    }
}

<?php

namespace App\Availability\Factories;

use App\Availability\Models\AvailabilityRequest;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AvailabilityRequest>
 */
class AvailabilityRequestFactory extends Factory
{
    protected $model = AvailabilityRequest::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-21',
            'deadline' => '2026-06-12',
            'status' => 'open',
        ];
    }
}

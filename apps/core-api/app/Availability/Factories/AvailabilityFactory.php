<?php

namespace App\Availability\Factories;

use App\Availability\Enums\AvailabilityKind;
use App\Availability\Models\Availability;
use App\Members\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Availability>
 */
class AvailabilityFactory extends Factory
{
    protected $model = Availability::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'member_id' => Member::factory(),
            'kind' => AvailabilityKind::Unavailable,
            'recurrence' => null,
            'days' => null,
            'start_time' => null,
            'end_time' => null,
            'start_at' => '2026-06-20 00:00:00',
            'end_at' => '2026-06-25 23:59:00',
            'reason' => 'Vacation',
        ];
    }
}

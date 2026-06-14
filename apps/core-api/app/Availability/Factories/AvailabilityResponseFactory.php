<?php

namespace App\Availability\Factories;

use App\Availability\Enums\ResponseStatus;
use App\Availability\Models\AvailabilityRequest;
use App\Availability\Models\AvailabilityResponse;
use App\Members\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AvailabilityResponse>
 */
class AvailabilityResponseFactory extends Factory
{
    protected $model = AvailabilityResponse::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'availability_request_id' => AvailabilityRequest::factory(),
            'member_id' => Member::factory(),
            'status' => ResponseStatus::Pending,
            'submitted_at' => null,
        ];
    }
}

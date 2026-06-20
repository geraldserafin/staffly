<?php

namespace App\Auth\Factories;

use App\Auth\Models\Invitation;
use App\Members\Models\Member;
use App\Organizations\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Invitation>
 */
class InvitationFactory extends Factory
{
    protected $model = Invitation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'member_id' => Member::factory(),
            'email' => fake()->safeEmail(),
            'token' => Str::random(60),
            'expires_at' => now()->addDays(7),
            'accepted_at' => null,
        ];
    }
}

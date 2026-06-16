<?php

namespace App\Scheduling\Factories;

use App\Members\Models\Member;
use App\Scheduling\Models\MemberSatisfaction;
use App\Scheduling\Models\Schedule;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MemberSatisfaction>
 */
class MemberSatisfactionFactory extends Factory
{
    protected $model = MemberSatisfaction::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'member_id' => Member::factory(),
            'team_id' => Team::factory(),
            'schedule_id' => Schedule::factory(),
            'period_start' => '2026-06-01',
            'period_end' => '2026-06-30',
            'dissatisfaction' => fake()->numberBetween(0, 1_000_000),
        ];
    }
}

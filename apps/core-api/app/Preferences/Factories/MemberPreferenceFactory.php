<?php

namespace App\Preferences\Factories;

use App\Members\Models\Member;
use App\Preferences\Enums\PreferenceMode;
use App\Preferences\Enums\PreferenceType;
use App\Preferences\Models\MemberPreference;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MemberPreference>
 */
class MemberPreferenceFactory extends Factory
{
    protected $model = MemberPreference::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'member_id' => Member::factory(),
            'type' => PreferenceType::PreferredShiftType,
            'params' => ['type' => 'night'],
            'weight' => 3,
            'mode' => PreferenceMode::Soft,
            'hard_approved' => false,
        ];
    }
}

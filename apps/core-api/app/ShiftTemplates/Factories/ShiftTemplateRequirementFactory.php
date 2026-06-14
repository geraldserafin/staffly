<?php

namespace App\ShiftTemplates\Factories;

use App\ShiftTemplates\Enums\RequirementType;
use App\ShiftTemplates\Models\ShiftTemplate;
use App\ShiftTemplates\Models\ShiftTemplateRequirement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShiftTemplateRequirement>
 */
class ShiftTemplateRequirementFactory extends Factory
{
    protected $model = ShiftTemplateRequirement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shift_template_id' => ShiftTemplate::factory(),
            'skill_id' => null,
            'type' => RequirementType::Headcount,
            'count' => 1,
        ];
    }
}

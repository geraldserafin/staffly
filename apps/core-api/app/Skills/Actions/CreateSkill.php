<?php

namespace App\Skills\Actions;

use App\Organizations\Models\Organization;
use App\Skills\Models\Skill;

class CreateSkill
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Organization $organization, array $data): Skill
    {
        $skill = new Skill($data);
        $skill->organization()->associate($organization);
        $skill->save();

        return $skill;
    }
}

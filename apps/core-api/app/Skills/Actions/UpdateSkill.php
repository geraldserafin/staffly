<?php

namespace App\Skills\Actions;

use App\Skills\Models\Skill;

class UpdateSkill
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Skill $skill, array $data): Skill
    {
        $skill->update($data);

        return $skill;
    }
}

<?php

namespace App\Skills\Actions;

use App\Skills\Models\Skill;

class ShowSkill
{
    public function handle(Skill $skill): Skill
    {
        return $skill;
    }
}

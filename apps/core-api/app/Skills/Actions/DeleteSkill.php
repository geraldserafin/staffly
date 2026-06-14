<?php

namespace App\Skills\Actions;

use App\Skills\Models\Skill;

class DeleteSkill
{
    public function handle(Skill $skill): void
    {
        $skill->delete();
    }
}

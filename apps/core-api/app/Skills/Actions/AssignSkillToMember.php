<?php

namespace App\Skills\Actions;

use App\Members\Models\Member;
use App\Skills\Models\Skill;

class AssignSkillToMember
{
    public function handle(Skill $skill, Member $member): void
    {
        // Idempotent: re-assigning is a no-op, not a duplicate pivot row.
        $skill->members()->syncWithoutDetaching([$member->getKey()]);
    }
}

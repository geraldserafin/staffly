<?php

namespace App\Skills\Actions;

use App\Members\Models\Member;
use App\Skills\Models\Skill;

class RemoveSkillFromMember
{
    public function handle(Skill $skill, Member $member): void
    {
        $skill->members()->detach($member->getKey());
    }
}

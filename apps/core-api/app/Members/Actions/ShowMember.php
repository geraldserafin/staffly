<?php

namespace App\Members\Actions;

use App\Members\Models\Member;

class ShowMember
{
    public function handle(Member $member): Member
    {
        return $member;
    }
}

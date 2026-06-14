<?php

namespace App\Members\Actions;

use App\Members\Models\Member;

class DeleteMember
{
    public function handle(Member $member): void
    {
        $member->delete();
    }
}

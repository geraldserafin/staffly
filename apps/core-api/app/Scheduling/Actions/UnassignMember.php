<?php

namespace App\Scheduling\Actions;

use App\Members\Models\Member;
use App\Scheduling\Models\ScheduledShift;

class UnassignMember
{
    public function handle(ScheduledShift $shift, Member $member): void
    {
        $shift->assignments()
            ->where('member_id', $member->getKey())
            ->delete();
    }
}

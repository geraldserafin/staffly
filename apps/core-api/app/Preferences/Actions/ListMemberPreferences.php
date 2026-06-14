<?php

namespace App\Preferences\Actions;

use App\Members\Models\Member;
use App\Preferences\Models\MemberPreference;
use Illuminate\Database\Eloquent\Collection;

class ListMemberPreferences
{
    /**
     * @return Collection<int, MemberPreference>
     */
    public function handle(Member $member): Collection
    {
        return (new MemberPreference)->newQuery()
            ->where('member_id', $member->getKey())
            ->get();
    }
}

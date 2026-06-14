<?php

namespace App\Availability\Actions;

use App\Availability\Models\Availability;
use App\Members\Models\Member;
use Illuminate\Database\Eloquent\Collection;

class ListMemberAvailabilities
{
    /**
     * @return Collection<int, Availability>
     */
    public function handle(Member $member): Collection
    {
        return (new Availability)->newQuery()
            ->where('member_id', $member->getKey())
            ->get();
    }
}

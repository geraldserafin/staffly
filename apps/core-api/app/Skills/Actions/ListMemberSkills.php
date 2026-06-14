<?php

namespace App\Skills\Actions;

use App\Members\Models\Member;
use App\Skills\Models\Skill;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class ListMemberSkills
{
    /**
     * @return Collection<int, Skill>
     */
    public function handle(Member $member): Collection
    {
        return (new Skill)->newQuery()
            ->whereHas('members', fn (Builder $query) => $query->whereKey($member->getKey()))
            ->get();
    }
}

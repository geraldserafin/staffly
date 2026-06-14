<?php

namespace App\Members\Actions;

use App\Members\Models\Member;
use App\Organizations\Models\Organization;
use Illuminate\Database\Eloquent\Collection;

class ListOrganizationMembers
{
    /**
     * @return Collection<int, Member>
     */
    public function handle(Organization $organization): Collection
    {
        return (new Member)->newQuery()
            ->where('organization_id', $organization->getKey())
            ->get();
    }
}

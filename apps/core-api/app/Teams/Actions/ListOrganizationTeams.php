<?php

namespace App\Teams\Actions;

use App\Organizations\Models\Organization;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Collection;

class ListOrganizationTeams
{
    /**
     * @return Collection<int, Team>
     */
    public function handle(Organization $organization): Collection
    {
        return (new Team)->newQuery()
            ->where('organization_id', $organization->getKey())
            ->get();
    }
}

<?php

namespace App\Skills\Actions;

use App\Organizations\Models\Organization;
use App\Skills\Models\Skill;
use Illuminate\Database\Eloquent\Collection;

class ListOrganizationSkills
{
    /**
     * @return Collection<int, Skill>
     */
    public function handle(Organization $organization): Collection
    {
        return (new Skill)->newQuery()
            ->where('organization_id', $organization->getKey())
            ->get();
    }
}

<?php

namespace App\ShiftTemplates\Actions;

use App\Organizations\Models\Organization;
use App\ShiftTemplates\Models\ShiftTemplate;
use Illuminate\Database\Eloquent\Collection;

class ListOrganizationShiftTemplates
{
    /**
     * @return Collection<int, ShiftTemplate>
     */
    public function handle(Organization $organization): Collection
    {
        return (new ShiftTemplate)->newQuery()
            ->where('organization_id', $organization->getKey())
            ->with(['requirements', 'teams'])
            ->get();
    }
}

<?php

namespace App\Organizations\Actions;

use App\Organizations\Models\Organization;
use Illuminate\Database\Eloquent\Collection;

class ListOrganizations
{
    /**
     * @return Collection<int, Organization>
     */
    public function handle(): Collection
    {
        return (new Organization)->newQuery()
            ->orderBy('name')
            ->get();
    }
}

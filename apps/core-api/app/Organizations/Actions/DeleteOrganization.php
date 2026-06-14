<?php

namespace App\Organizations\Actions;

use App\Organizations\Models\Organization;

class DeleteOrganization
{
    public function handle(Organization $organization): void
    {
        $organization->delete();
    }
}

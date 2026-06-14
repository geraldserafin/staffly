<?php

namespace App\Organizations\Actions;

use App\Organizations\Models\Organization;

class ShowOrganization
{
    public function handle(Organization $organization): Organization
    {
        return $organization;
    }
}

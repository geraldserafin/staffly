<?php

namespace App\Organizations\Actions;

use App\Organizations\Models\Organization;

class UpdateOrganization
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Organization $organization, array $data): Organization
    {
        $organization->update($data);

        return $organization;
    }
}

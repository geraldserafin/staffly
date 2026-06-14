<?php

namespace App\Organizations\Actions;

use App\Organizations\Models\Organization;

class CreateOrganization
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(array $data): Organization
    {
        $organization = new Organization($data);
        $organization->save();

        return $organization;
    }
}

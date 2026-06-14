<?php

namespace App\Organizations\Events;

use App\Organizations\Models\Organization;
use Illuminate\Foundation\Events\Dispatchable;

class OrganizationCreated
{
    use Dispatchable;

    public function __construct(
        public readonly Organization $organization,
    ) {}
}

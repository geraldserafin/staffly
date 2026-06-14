<?php

namespace App\Teams\Listeners;

use App\Organizations\Events\OrganizationCreated;
use App\Teams\Actions\CreateTeam;

class CreateDefaultTeam
{
    public function __construct(
        private readonly CreateTeam $createTeam,
    ) {}

    public function handle(OrganizationCreated $event): void
    {
        $this->createTeam->handle($event->organization, ['name' => 'Main']);
    }
}

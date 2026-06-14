<?php

namespace App\Availability\Actions;

use App\Availability\Models\Availability;

class DeleteAvailability
{
    public function handle(Availability $availability): void
    {
        $availability->delete();
    }
}

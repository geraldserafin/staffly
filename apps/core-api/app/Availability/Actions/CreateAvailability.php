<?php

namespace App\Availability\Actions;

use App\Availability\Models\Availability;
use App\Members\Models\Member;

class CreateAvailability
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Member $member, array $data): Availability
    {
        $availability = new Availability($data);
        $availability->member()->associate($member);
        $availability->save();

        return $availability;
    }
}

<?php

namespace App\Members\Actions;

use App\Members\Models\Member;
use App\Organizations\Models\Organization;

class CreateMember
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Organization $organization, array $data): Member
    {
        $member = new Member($data);
        $member->organization()->associate($organization);
        $member->save();

        return $member;
    }
}

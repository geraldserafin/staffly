<?php

namespace App\Members\Actions;

use App\Members\Models\Member;

class UpdateMember
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Member $member, array $data): Member
    {
        $member->update($data);

        return $member;
    }
}

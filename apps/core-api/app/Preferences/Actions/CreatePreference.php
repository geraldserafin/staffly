<?php

namespace App\Preferences\Actions;

use App\Members\Models\Member;
use App\Preferences\Models\MemberPreference;

class CreatePreference
{
    /**
     * Employee-authored. Hard approval is never set here — a manager grants it.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(Member $member, array $data): MemberPreference
    {
        $preference = new MemberPreference($data);
        $preference->hard_approved = false;
        $preference->member()->associate($member);
        $preference->save();

        return $preference;
    }
}

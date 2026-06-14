<?php

namespace App\Preferences\Actions;

use App\Preferences\Models\MemberPreference;

class RevokePreference
{
    public function handle(MemberPreference $preference): MemberPreference
    {
        $preference->hard_approved = false;
        $preference->save();

        return $preference;
    }
}

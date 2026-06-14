<?php

namespace App\Preferences\Actions;

use App\Preferences\Models\MemberPreference;

class ApprovePreference
{
    public function handle(MemberPreference $preference): MemberPreference
    {
        $preference->hard_approved = true;
        $preference->save();

        return $preference;
    }
}

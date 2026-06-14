<?php

namespace App\Preferences\Actions;

use App\Preferences\Models\MemberPreference;

class DeletePreference
{
    public function handle(MemberPreference $preference): void
    {
        $preference->delete();
    }
}

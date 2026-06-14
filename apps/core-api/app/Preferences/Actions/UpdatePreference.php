<?php

namespace App\Preferences\Actions;

use App\Preferences\Enums\PreferenceMode;
use App\Preferences\Models\MemberPreference;

class UpdatePreference
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(MemberPreference $preference, array $data): MemberPreference
    {
        $preference->fill($data);

        // Dropping back to soft clears any previously granted hard approval.
        if ($preference->mode === PreferenceMode::Soft) {
            $preference->hard_approved = false;
        }

        $preference->save();

        return $preference;
    }
}

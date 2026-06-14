<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\ShiftRequirement;

class UpdateShiftRequirement
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(ShiftRequirement $requirement, array $data): ShiftRequirement
    {
        $requirement->update($data);

        return $requirement;
    }
}

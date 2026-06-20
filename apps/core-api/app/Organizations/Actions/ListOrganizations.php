<?php

namespace App\Organizations\Actions;

use App\Auth\Models\User;
use App\Organizations\Models\Organization;
use Illuminate\Database\Eloquent\Collection;

class ListOrganizations
{
    /**
     * @return Collection<int, Organization>
     */
    public function handle(?User $user = null): Collection
    {
        $query = Organization::query()->orderBy('name');

        if ($user) {
            $query->whereHas('members', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        return $query->get();
    }
}

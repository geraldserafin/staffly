<?php

namespace Tests\Support;

use App\Auth\Actions\AssignRole;
use App\Auth\Models\User;
use App\Members\Models\Member;
use App\Organizations\Models\Organization;

trait ActsAsMember
{
    /**
     * Create a User + Member in the given org, assign the owner role
     * (full permissions), and authenticate as that user via Sanctum.
     */
    protected function actingAsOwner(Organization $org): User
    {
        return $this->actingAsRole($org, 'owner');
    }

    /**
     * Create a User + Member with the manager role and authenticate.
     */
    protected function actingAsManager(Organization $org): User
    {
        return $this->actingAsRole($org, 'manager');
    }

    /**
     * Create a User + Member with the member role (view-only + self-service).
     */
    protected function actingAsEmployee(Organization $org): User
    {
        return $this->actingAsRole($org, 'member');
    }

    /**
     * Create a fresh user, link it to the org as a Member, assign the
     * requested role, and authenticate via Sanctum.
     */
    protected function actingAsRole(Organization $org, string $role): User
    {
        $user = User::factory()->create();

        Member::unguarded(function () use ($user, $org): void {
            Member::create([
                'name' => $user->name,
                'email' => $user->email,
                'organization_id' => $org->id,
                'user_id' => $user->id,
                'invitation_accepted_at' => now(),
            ]);
        });

        app(AssignRole::class)->handle($user, $org->id, $role);

        setPermissionsTeamId($org->id);

        $this->actingAs($user, 'sanctum');

        return $user;
    }
}

<?php

namespace App\Auth\Actions;

use App\Auth\Models\User;
use App\Auth\Roles\RoleDefaults;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AssignRole
{
    /**
     * Assign a role to a user scoped to an organisation (team).
     *
     * Creates the per-org role if it doesn't exist, syncs the role's
     * default permissions, and assigns the role to the user.
     */
    public function handle(User $user, string $organizationId, string $roleName): void
    {
        setPermissionsTeamId($organizationId);

        $this->ensurePermissionsExist();

        $role = Role::firstOrCreate(
            ['name' => $roleName, 'team_id' => $organizationId, 'guard_name' => 'sanctum'],
        );

        $role->syncPermissions(RoleDefaults::for($roleName));

        $user->assignRole($role);
    }

    /**
     * Create all global permission definitions if they don't exist yet.
     */
    private function ensurePermissionsExist(): void
    {
        foreach (RoleDefaults::allPermissions() as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'sanctum']);
        }
    }
}

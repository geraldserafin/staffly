<?php

namespace App\Auth\Roles;

class RoleDefaults
{
    /**
     * All permission names the system knows about.
     *
     * @return list<string>
     */
    public static function allPermissions(): array
    {
        return [
            // Organisation
            'organizations.update',
            'organizations.delete',

            // Members
            'members.view',
            'members.create',
            'members.update',
            'members.delete',

            // Teams
            'teams.view',
            'teams.create',
            'teams.update',
            'teams.delete',
            'teams.members.manage',

            // Skills
            'skills.view',
            'skills.create',
            'skills.update',
            'skills.delete',

            // Shift templates
            'templates.view',
            'templates.create',
            'templates.update',
            'templates.delete',
            'templates.attach',

            // Schedules
            'schedules.view',
            'schedules.create',
            'schedules.update',
            'schedules.delete',
            'schedules.solve',
            'schedules.publish',

            // Self-service
            'availability.view',
            'availability.submit',
            'preferences.view',
            'preferences.update',
        ];
    }

    /**
     * Permissions granted to each role by default.
     *
     * @return list<string>
     */
    public static function for(string $role): array
    {
        return match ($role) {
            'owner' => self::allPermissions(),
            'manager' => array_values(array_filter(
                self::allPermissions(),
                fn (string $p) => ! in_array($p, ['organizations.delete', 'members.delete'], true),
            )),
            'member' => [
                'members.view',
                'teams.view',
                'skills.view',
                'templates.view',
                'schedules.view',
                'availability.view',
                'availability.submit',
                'preferences.view',
                'preferences.update',
            ],
            default => [],
        };
    }

    /**
     * @return list<string>
     */
    public static function roles(): array
    {
        return ['owner', 'manager', 'member'];
    }
}

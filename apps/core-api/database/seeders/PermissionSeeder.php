<?php

namespace Database\Seeders;

use App\Auth\Roles\RoleDefaults;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (RoleDefaults::allPermissions() as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'sanctum']);
        }
    }
}

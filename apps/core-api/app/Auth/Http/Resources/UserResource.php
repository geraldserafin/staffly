<?php

namespace App\Auth\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Spatie\Permission\Models\Role;

class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $memberships = $this->members->map(function ($member) {
            setPermissionsTeamId($member->organization_id);

            return [
                'organizationId' => $member->organization_id,
                'organizationName' => $member->organization->name,
                'memberId' => $member->id,
                'role' => $this->roles->first()?->name,
                'permissions' => $this->getAllPermissions()->pluck('name')->values(),
            ];
        });

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'emailVerifiedAt' => $this->email_verified_at,
            'memberships' => $memberships,
        ];
    }
}

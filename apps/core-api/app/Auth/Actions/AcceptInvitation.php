<?php

namespace App\Auth\Actions;

use App\Auth\Models\Invitation;
use App\Auth\Models\User;

class AcceptInvitation
{
    public function __construct(
        private readonly IssueTokens $issueTokens,
        private readonly AssignRole $assignRole,
    ) {}

    /**
     * Accept an invitation: create or link a User account, set password,
     * link the Member, assign the "member" role, mark invitation consumed.
     *
     * @return array{user: User, accessToken: string, refreshToken: string}
     */
    public function handle(Invitation $invitation, string $password): array
    {
        $user = User::firstOrCreate(
            ['email' => $invitation->email],
            [
                'name' => $invitation->member->name,
                'password' => $password,
                'email_verified_at' => now(),
            ],
        );

        if (! $user->wasRecentlyCreated) {
            $user->update(['password' => $password]);
        }

        $invitation->member->update([
            'user_id' => $user->id,
            'invitation_accepted_at' => now(),
        ]);

        $invitation->update(['accepted_at' => now()]);

        $this->assignRole->handle($user, $invitation->organization_id, $invitation->member->role ?: 'member');

        $tokens = $this->issueTokens->handle($user);

        return [
            'user' => $user,
            ...$tokens,
        ];
    }
}

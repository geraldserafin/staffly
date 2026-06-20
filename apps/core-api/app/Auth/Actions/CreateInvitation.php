<?php

namespace App\Auth\Actions;

use App\Auth\Mail\InvitationMail;
use App\Auth\Models\Invitation;
use App\Members\Models\Member;
use App\Organizations\Models\Organization;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class CreateInvitation
{
    /**
     * Invite a member to an organisation by email.
     *
     * Always creates a signed invitation token and emails it —
     * the recipient must explicitly accept or reject, even if
     * they already have an account.
     */
    public function handle(Organization $organization, Member $member, string $email): void
    {
        $invitation = Invitation::create([
            'organization_id' => $organization->id,
            'member_id' => $member->id,
            'email' => $email,
            'token' => Str::random(60),
            'expires_at' => now()->addDays(7),
        ]);

        Mail::to($email)->send(new InvitationMail(
            organization: $organization,
            member: $member,
            token: $invitation->token,
        ));
    }
}

<?php

namespace App\Auth\Mail;

use App\Members\Models\Member;
use App\Organizations\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InvitationMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly Organization $organization,
        public readonly Member $member,
        public readonly string $token,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Invitation to join {$this->organization->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'auth.emails.invitation',
            with: [
                'organizationName' => $this->organization->name,
                'memberName' => $this->member->name,
                'acceptUrl' => config('app.frontend_url')."/accept-invitation/{$this->token}",
            ],
        );
    }
}

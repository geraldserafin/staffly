<?php

namespace App\Auth\Actions;

use App\Auth\Models\User;

class RegisterUser
{
    public function __construct(
        private readonly IssueTokens $issueTokens,
    ) {}

    /**
     * Register a new user account. No organization is created here —
     * the user is redirected to onboarding to create their first org.
     *
     * @param  array{name: string, email: string, password: string}  $data
     * @return array{user: User, accessToken: string, refreshToken: string}
     */
    public function handle(array $data): array
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'email_verified_at' => now(),
        ]);

        $tokens = $this->issueTokens->handle($user);

        return [
            'user' => $user,
            ...$tokens,
        ];
    }
}

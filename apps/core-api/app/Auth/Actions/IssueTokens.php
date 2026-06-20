<?php

namespace App\Auth\Actions;

use App\Auth\Models\User;

class IssueTokens
{
    /**
     * Issue a short-lived access token and a long-lived rotatable refresh token.
     *
     * @return array{accessToken: string, refreshToken: string}
     */
    public function handle(User $user): array
    {
        $accessToken = $user->createToken(
            'access',
            ['access'],
            now()->addMinutes(60),
        );

        $refreshToken = $user->createToken(
            'refresh',
            ['refresh'],
            now()->addDays(30),
        );

        return [
            'accessToken' => $accessToken->plainTextToken,
            'refreshToken' => $refreshToken->plainTextToken,
        ];
    }
}

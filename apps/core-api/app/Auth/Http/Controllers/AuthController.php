<?php

namespace App\Auth\Http\Controllers;

use App\Auth\Actions\IssueTokens;
use App\Auth\Actions\RegisterUser;
use App\Auth\Http\Requests\LoginRequest;
use App\Auth\Http\Requests\RegisterRequest;
use App\Auth\Http\Resources\UserResource;
use App\Auth\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController
{
    public function __construct(
        private readonly RegisterUser $registerUser,
        private readonly IssueTokens $issueTokens,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->registerUser->handle($request->validated());

        return response()->json([
            'user' => UserResource::make($result['user'])->resolve($request),
            'accessToken' => $result['accessToken'],
            'refreshToken' => $result['refreshToken'],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->input('email'))->first();

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $tokens = $this->issueTokens->handle($user);

        return response()->json([
            'user' => UserResource::make($user)->resolve($request),
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $request->validate(['refreshToken' => ['required', 'string']]);

        $token = PersonalAccessToken::findToken($request->input('refreshToken'));

        if (! $token || ! $token->can('refresh') || ($token->expires_at && $token->expires_at->isPast())) {
            return response()->json(['message' => 'Invalid or expired refresh token'], 401);
        }

        $user = $token->tokenable;
        $token->delete();

        $tokens = $this->issueTokens->handle($user);

        return response()->json([
            'user' => UserResource::make($user)->resolve($request),
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => UserResource::make($request->user())->resolve($request),
        ]);
    }
}

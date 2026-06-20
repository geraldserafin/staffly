<?php

namespace App\Auth\Http\Controllers;

use App\Auth\Actions\AcceptInvitation;
use App\Auth\Http\Requests\AcceptInvitationRequest;
use App\Auth\Http\Resources\UserResource;
use App\Auth\Models\Invitation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvitationController
{
    public function __construct(
        private readonly AcceptInvitation $acceptInvitation,
    ) {}

    public function show(string $token): JsonResponse
    {
        $invitation = Invitation::with(['organization', 'member'])
            ->where('token', $token)
            ->first();

        if (! $invitation) {
            return response()->json(['message' => 'Invitation not found'], 404);
        }

        if ($invitation->isAccepted()) {
            return response()->json(['message' => 'This invitation has already been accepted'], 410);
        }

        if ($invitation->isExpired()) {
            return response()->json(['message' => 'This invitation has expired'], 410);
        }

        return response()->json([
            'organizationName' => $invitation->organization->name,
            'memberName' => $invitation->member->name,
            'email' => $invitation->email,
            'expiresAt' => $invitation->expires_at,
        ]);
    }

    public function accept(AcceptInvitationRequest $request, string $token): JsonResponse|Response
    {
        $invitation = Invitation::where('token', $token)->first();

        if (! $invitation) {
            return response()->json(['message' => 'Invitation not found'], 404);
        }

        if ($invitation->isAccepted()) {
            return response()->json(['message' => 'This invitation has already been accepted'], 410);
        }

        if ($invitation->isExpired()) {
            return response()->json(['message' => 'This invitation has expired'], 410);
        }

        $result = $this->acceptInvitation->handle($invitation, $request->input('password'));

        return response()->json([
            'user' => UserResource::make($result['user'])->resolve($request),
            'accessToken' => $result['accessToken'],
            'refreshToken' => $result['refreshToken'],
        ], 201);
    }

    public function reject(string $token): JsonResponse
    {
        $invitation = Invitation::where('token', $token)->first();

        if (! $invitation) {
            return response()->json(['message' => 'Invitation not found'], 404);
        }

        if ($invitation->isAccepted()) {
            return response()->json(['message' => 'This invitation has already been accepted'], 410);
        }

        $invitation->delete();

        return response()->json(['message' => 'Invitation rejected']);
    }
}

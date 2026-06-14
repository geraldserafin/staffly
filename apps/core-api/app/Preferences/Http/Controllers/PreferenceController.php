<?php

namespace App\Preferences\Http\Controllers;

use App\Members\Models\Member;
use App\Preferences\Actions\ApprovePreference;
use App\Preferences\Actions\CreatePreference;
use App\Preferences\Actions\DeletePreference;
use App\Preferences\Actions\ListMemberPreferences;
use App\Preferences\Actions\RevokePreference;
use App\Preferences\Actions\UpdatePreference;
use App\Preferences\Http\Requests\StorePreferenceRequest;
use App\Preferences\Http\Requests\UpdatePreferenceRequest;
use App\Preferences\Http\Resources\MemberPreferenceResource;
use App\Preferences\Models\MemberPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PreferenceController
{
    public function index(Member $member, ListMemberPreferences $action): AnonymousResourceCollection
    {
        return MemberPreferenceResource::collection($action->handle($member));
    }

    public function store(StorePreferenceRequest $request, Member $member, CreatePreference $action): JsonResponse
    {
        $preference = $action->handle($member, $request->validated());

        return MemberPreferenceResource::make($preference)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdatePreferenceRequest $request, MemberPreference $preference, UpdatePreference $action): MemberPreferenceResource
    {
        return MemberPreferenceResource::make($action->handle($preference, $request->validated()));
    }

    public function destroy(MemberPreference $preference, DeletePreference $action): Response
    {
        $action->handle($preference);

        return response()->noContent();
    }

    // Manager governance: grant/revoke hard status.
    public function approve(MemberPreference $preference, ApprovePreference $action): MemberPreferenceResource
    {
        return MemberPreferenceResource::make($action->handle($preference));
    }

    public function revoke(MemberPreference $preference, RevokePreference $action): MemberPreferenceResource
    {
        return MemberPreferenceResource::make($action->handle($preference));
    }
}

<?php

use App\Availability\Http\Controllers\AvailabilityController;
use App\Availability\Http\Controllers\AvailabilityRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Member availability entries (recurring + one-off)
    Route::get('members/{member}/availabilities', [AvailabilityController::class, 'index'])->middleware('permission:availability.view');
    Route::post('members/{member}/availabilities', [AvailabilityController::class, 'store'])->middleware('permission:availability.submit');
    Route::delete('availabilities/{availability}', [AvailabilityController::class, 'destroy'])->middleware('permission:availability.submit');

    // Availability requests (the collection round)
    Route::get('teams/{team}/availability-requests', [AvailabilityRequestController::class, 'index'])->middleware('permission:teams.members.manage');
    Route::post('teams/{team}/availability-requests', [AvailabilityRequestController::class, 'store'])->middleware('permission:teams.members.manage');
    Route::get('availability-requests/{availabilityRequest}', [AvailabilityRequestController::class, 'show'])->middleware('permission:availability.view');
    Route::post('availability-requests/{availabilityRequest}/close', [AvailabilityRequestController::class, 'close'])->middleware('permission:teams.members.manage');
    Route::get('availability-requests/{availabilityRequest}/responses', [AvailabilityRequestController::class, 'responses'])->middleware('permission:teams.members.manage');
    Route::post('availability-requests/{availabilityRequest}/members/{member}/submit', [AvailabilityRequestController::class, 'submit'])->middleware('permission:availability.submit');
});

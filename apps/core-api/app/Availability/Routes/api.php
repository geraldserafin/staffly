<?php

use App\Availability\Http\Controllers\AvailabilityController;
use App\Availability\Http\Controllers\AvailabilityRequestController;
use Illuminate\Support\Facades\Route;

// Member availability entries (recurring + one-off)
Route::get('members/{member}/availabilities', [AvailabilityController::class, 'index']);
Route::post('members/{member}/availabilities', [AvailabilityController::class, 'store']);
Route::delete('availabilities/{availability}', [AvailabilityController::class, 'destroy']);

// Availability requests (the collection round)
Route::get('teams/{team}/availability-requests', [AvailabilityRequestController::class, 'index']);
Route::post('teams/{team}/availability-requests', [AvailabilityRequestController::class, 'store']);
Route::get('availability-requests/{availabilityRequest}', [AvailabilityRequestController::class, 'show']);
Route::post('availability-requests/{availabilityRequest}/close', [AvailabilityRequestController::class, 'close']);
Route::get('availability-requests/{availabilityRequest}/responses', [AvailabilityRequestController::class, 'responses']);
Route::post('availability-requests/{availabilityRequest}/members/{member}/submit', [AvailabilityRequestController::class, 'submit']);

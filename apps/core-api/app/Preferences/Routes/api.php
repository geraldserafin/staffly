<?php

use App\Preferences\Http\Controllers\PreferenceController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Employee-authored preferences
    Route::get('members/{member}/preferences', [PreferenceController::class, 'index'])->middleware('permission:preferences.view');
    Route::post('members/{member}/preferences', [PreferenceController::class, 'store'])->middleware('permission:preferences.update');
    Route::put('preferences/{preference}', [PreferenceController::class, 'update'])->middleware('permission:preferences.update');
    Route::delete('preferences/{preference}', [PreferenceController::class, 'destroy'])->middleware('permission:preferences.update');

    // Manager governance: grant/revoke hard status
    Route::post('preferences/{preference}/approve', [PreferenceController::class, 'approve'])->middleware('permission:members.update');
    Route::post('preferences/{preference}/revoke', [PreferenceController::class, 'revoke'])->middleware('permission:members.update');
});

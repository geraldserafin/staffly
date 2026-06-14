<?php

use App\Preferences\Http\Controllers\PreferenceController;
use Illuminate\Support\Facades\Route;

// Employee-authored preferences
Route::get('members/{member}/preferences', [PreferenceController::class, 'index']);
Route::post('members/{member}/preferences', [PreferenceController::class, 'store']);
Route::put('preferences/{preference}', [PreferenceController::class, 'update']);
Route::delete('preferences/{preference}', [PreferenceController::class, 'destroy']);

// Manager governance: grant/revoke hard status
Route::post('preferences/{preference}/approve', [PreferenceController::class, 'approve']);
Route::post('preferences/{preference}/revoke', [PreferenceController::class, 'revoke']);

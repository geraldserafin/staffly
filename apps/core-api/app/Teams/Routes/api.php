<?php

use App\Teams\Http\Controllers\TeamController;
use Illuminate\Support\Facades\Route;

Route::get('organizations/{organization}/teams', [TeamController::class, 'index']);
Route::post('organizations/{organization}/teams', [TeamController::class, 'store']);

Route::get('teams/{team}', [TeamController::class, 'show']);
Route::put('teams/{team}', [TeamController::class, 'update']);
Route::delete('teams/{team}', [TeamController::class, 'destroy']);

Route::get('teams/{team}/members', [TeamController::class, 'members']);
Route::put('teams/{team}/members/{member}', [TeamController::class, 'attachMember']);
Route::delete('teams/{team}/members/{member}', [TeamController::class, 'detachMember']);

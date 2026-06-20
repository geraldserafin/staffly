<?php

use App\Teams\Http\Controllers\TeamController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('organizations/{organization}/teams', [TeamController::class, 'index'])->middleware('permission:teams.view');
    Route::post('organizations/{organization}/teams', [TeamController::class, 'store'])->middleware('permission:teams.create');

    Route::get('teams/{team}', [TeamController::class, 'show'])->middleware('permission:teams.view');
    Route::put('teams/{team}', [TeamController::class, 'update'])->middleware('permission:teams.update');
    Route::delete('teams/{team}', [TeamController::class, 'destroy'])->middleware('permission:teams.delete');

    Route::get('teams/{team}/members', [TeamController::class, 'members'])->middleware('permission:teams.view');
    Route::put('teams/{team}/members/{member}', [TeamController::class, 'attachMember'])->middleware('permission:teams.members.manage');
    Route::delete('teams/{team}/members/{member}', [TeamController::class, 'detachMember'])->middleware('permission:teams.members.manage');
});

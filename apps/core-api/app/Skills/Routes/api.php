<?php

use App\Skills\Http\Controllers\SkillController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('organizations/{organization}/skills', [SkillController::class, 'index'])->middleware('permission:skills.view');
    Route::post('organizations/{organization}/skills', [SkillController::class, 'store'])->middleware('permission:skills.create');

    Route::get('skills/{skill}', [SkillController::class, 'show'])->middleware('permission:skills.view');
    Route::put('skills/{skill}', [SkillController::class, 'update'])->middleware('permission:skills.update');
    Route::delete('skills/{skill}', [SkillController::class, 'destroy'])->middleware('permission:skills.delete');

    Route::get('members/{member}/skills', [SkillController::class, 'memberSkills'])->middleware('permission:skills.view');
    Route::put('members/{member}/skills/{skill}', [SkillController::class, 'assignToMember'])->middleware('permission:members.update');
    Route::delete('members/{member}/skills/{skill}', [SkillController::class, 'removeFromMember'])->middleware('permission:members.update');
});

<?php

use App\Skills\Http\Controllers\SkillController;
use Illuminate\Support\Facades\Route;

Route::get('organizations/{organization}/skills', [SkillController::class, 'index']);
Route::post('organizations/{organization}/skills', [SkillController::class, 'store']);

Route::get('skills/{skill}', [SkillController::class, 'show']);
Route::put('skills/{skill}', [SkillController::class, 'update']);
Route::delete('skills/{skill}', [SkillController::class, 'destroy']);

Route::get('members/{member}/skills', [SkillController::class, 'memberSkills']);
Route::put('members/{member}/skills/{skill}', [SkillController::class, 'assignToMember']);
Route::delete('members/{member}/skills/{skill}', [SkillController::class, 'removeFromMember']);

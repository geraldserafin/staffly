<?php

use App\ShiftTemplates\Http\Controllers\ShiftTemplateController;
use Illuminate\Support\Facades\Route;

Route::get('organizations/{organization}/shift-templates', [ShiftTemplateController::class, 'index']);
Route::post('organizations/{organization}/shift-templates', [ShiftTemplateController::class, 'store']);

Route::get('shift-templates/{shiftTemplate}', [ShiftTemplateController::class, 'show']);
Route::put('shift-templates/{shiftTemplate}', [ShiftTemplateController::class, 'update']);
Route::delete('shift-templates/{shiftTemplate}', [ShiftTemplateController::class, 'destroy']);

Route::post('shift-templates/{shiftTemplate}/requirements', [ShiftTemplateController::class, 'addRequirement']);
Route::delete('shift-template-requirements/{requirement}', [ShiftTemplateController::class, 'removeRequirement']);

// Team scoping (which templates generate shifts for a team).
Route::get('teams/{team}/shift-templates', [ShiftTemplateController::class, 'teamTemplates']);
Route::put('teams/{team}/shift-templates/{shiftTemplate}', [ShiftTemplateController::class, 'attachTeam']);
Route::delete('teams/{team}/shift-templates/{shiftTemplate}', [ShiftTemplateController::class, 'detachTeam']);

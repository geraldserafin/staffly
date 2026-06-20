<?php

use App\ShiftTemplates\Http\Controllers\ShiftTemplateController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('organizations/{organization}/shift-templates', [ShiftTemplateController::class, 'index'])->middleware('permission:templates.view');
    Route::post('organizations/{organization}/shift-templates', [ShiftTemplateController::class, 'store'])->middleware('permission:templates.create');

    Route::get('shift-templates/{shiftTemplate}', [ShiftTemplateController::class, 'show'])->middleware('permission:templates.view');
    Route::put('shift-templates/{shiftTemplate}', [ShiftTemplateController::class, 'update'])->middleware('permission:templates.update');
    Route::delete('shift-templates/{shiftTemplate}', [ShiftTemplateController::class, 'destroy'])->middleware('permission:templates.delete');

    Route::post('shift-templates/{shiftTemplate}/requirements', [ShiftTemplateController::class, 'addRequirement'])->middleware('permission:templates.update');
    Route::delete('shift-template-requirements/{requirement}', [ShiftTemplateController::class, 'removeRequirement'])->middleware('permission:templates.update');

    Route::get('teams/{team}/shift-templates', [ShiftTemplateController::class, 'teamTemplates'])->middleware('permission:templates.view');
    Route::put('teams/{team}/shift-templates/{shiftTemplate}', [ShiftTemplateController::class, 'attachTeam'])->middleware('permission:templates.attach');
    Route::delete('teams/{team}/shift-templates/{shiftTemplate}', [ShiftTemplateController::class, 'detachTeam'])->middleware('permission:templates.attach');
});

<?php

use App\Scheduling\Http\Controllers\ScheduleController;
use App\Scheduling\Http\Controllers\ScheduledShiftController;
use App\Scheduling\Http\Controllers\ShiftRequirementController;
use App\Scheduling\Http\Controllers\SolveController;
use App\Scheduling\Http\Controllers\TeamRuleController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Team scheduling rules (hard legal/safety limits)
    Route::get('teams/{team}/rules', [TeamRuleController::class, 'show'])->middleware('permission:teams.view');
    Route::put('teams/{team}/rules', [TeamRuleController::class, 'update'])->middleware('permission:teams.update');

    // Schedules
    Route::get('teams/{team}/schedules', [ScheduleController::class, 'index'])->middleware('permission:schedules.view');
    Route::post('teams/{team}/schedules', [ScheduleController::class, 'store'])->middleware('permission:schedules.create');
    Route::get('schedules/{schedule}', [ScheduleController::class, 'show'])->middleware('permission:schedules.view');
    Route::put('schedules/{schedule}', [ScheduleController::class, 'update'])->middleware('permission:schedules.update');
    Route::delete('schedules/{schedule}', [ScheduleController::class, 'destroy'])->middleware('permission:schedules.delete');
    Route::post('schedules/{schedule}/publish', [ScheduleController::class, 'publish'])->middleware('permission:schedules.publish');
    Route::post('schedules/{schedule}/archive', [ScheduleController::class, 'archive'])->middleware('permission:schedules.update');
    Route::post('schedules/{schedule}/shifts/generate', [ScheduleController::class, 'regenerate'])->middleware('permission:schedules.update');

    // Solver
    Route::post('schedules/{schedule}/solve', [SolveController::class, 'solve'])->middleware('permission:schedules.solve');
    Route::post('schedules/{schedule}/solve/preview', [SolveController::class, 'preview'])->middleware('permission:schedules.solve');
    Route::get('schedules/{schedule}/solve-runs', [SolveController::class, 'runs'])->middleware('permission:schedules.view');
    Route::get('schedules/{schedule}/insights', [SolveController::class, 'insights'])->middleware('permission:schedules.view');
    Route::get('solve-runs/{solveRun}', [SolveController::class, 'show'])->middleware('permission:schedules.view');
    Route::post('solve-runs/{solveRun}/apply', [SolveController::class, 'apply'])->middleware('permission:schedules.solve');

    // Shifts within a schedule
    Route::get('schedules/{schedule}/shifts', [ScheduledShiftController::class, 'index'])->middleware('permission:schedules.view');
    Route::post('schedules/{schedule}/shifts', [ScheduledShiftController::class, 'store'])->middleware('permission:schedules.update');
    Route::delete('scheduled-shifts/{scheduledShift}', [ScheduledShiftController::class, 'destroy'])->middleware('permission:schedules.update');

    // Per-shift requirement overrides (ad-hoc count changes)
    Route::post('scheduled-shifts/{scheduledShift}/requirements', [ShiftRequirementController::class, 'store'])->middleware('permission:schedules.update');
    Route::put('shift-requirements/{shiftRequirement}', [ShiftRequirementController::class, 'update'])->middleware('permission:schedules.update');
    Route::delete('shift-requirements/{shiftRequirement}', [ShiftRequirementController::class, 'destroy'])->middleware('permission:schedules.update');

    // Assignments on a shift
    Route::get('scheduled-shifts/{scheduledShift}/assignments', [ScheduledShiftController::class, 'assignments'])->middleware('permission:schedules.view');
    Route::post('scheduled-shifts/{scheduledShift}/assignments', [ScheduledShiftController::class, 'assign'])->middleware('permission:schedules.update');
    Route::delete('scheduled-shifts/{scheduledShift}/assignments/{member}', [ScheduledShiftController::class, 'unassign'])->middleware('permission:schedules.update');
    Route::patch('shift-assignments/{shiftAssignment}', [ScheduledShiftController::class, 'setLock'])->middleware('permission:schedules.update');
});

<?php

use App\Scheduling\Http\Controllers\ScheduleController;
use App\Scheduling\Http\Controllers\ScheduledShiftController;
use App\Scheduling\Http\Controllers\ShiftRequirementController;
use App\Scheduling\Http\Controllers\SolveController;
use App\Scheduling\Http\Controllers\TeamRuleController;
use Illuminate\Support\Facades\Route;

// Team scheduling rules (hard legal/safety limits)
Route::get('teams/{team}/rules', [TeamRuleController::class, 'show']);
Route::put('teams/{team}/rules', [TeamRuleController::class, 'update']);

// Schedules
Route::get('teams/{team}/schedules', [ScheduleController::class, 'index']);
Route::post('teams/{team}/schedules', [ScheduleController::class, 'store']);
Route::get('schedules/{schedule}', [ScheduleController::class, 'show']);
Route::put('schedules/{schedule}', [ScheduleController::class, 'update']);
Route::delete('schedules/{schedule}', [ScheduleController::class, 'destroy']);
Route::post('schedules/{schedule}/publish', [ScheduleController::class, 'publish']);
Route::post('schedules/{schedule}/archive', [ScheduleController::class, 'archive']);

// Solver
Route::post('schedules/{schedule}/solve', [SolveController::class, 'solve']);
Route::post('schedules/{schedule}/solve/preview', [SolveController::class, 'preview']);
Route::get('schedules/{schedule}/solve-runs', [SolveController::class, 'runs']);
Route::get('solve-runs/{solveRun}', [SolveController::class, 'show']);
Route::post('solve-runs/{solveRun}/apply', [SolveController::class, 'apply']);

// Shifts within a schedule
Route::get('schedules/{schedule}/shifts', [ScheduledShiftController::class, 'index']);
Route::post('schedules/{schedule}/shifts', [ScheduledShiftController::class, 'store']);
Route::delete('scheduled-shifts/{scheduledShift}', [ScheduledShiftController::class, 'destroy']);

// Per-shift requirement overrides (ad-hoc count changes)
Route::post('scheduled-shifts/{scheduledShift}/requirements', [ShiftRequirementController::class, 'store']);
Route::put('shift-requirements/{shiftRequirement}', [ShiftRequirementController::class, 'update']);
Route::delete('shift-requirements/{shiftRequirement}', [ShiftRequirementController::class, 'destroy']);

// Assignments on a shift
Route::get('scheduled-shifts/{scheduledShift}/assignments', [ScheduledShiftController::class, 'assignments']);
Route::post('scheduled-shifts/{scheduledShift}/assignments', [ScheduledShiftController::class, 'assign']);
Route::delete('scheduled-shifts/{scheduledShift}/assignments/{member}', [ScheduledShiftController::class, 'unassign']);
Route::patch('shift-assignments/{shiftAssignment}', [ScheduledShiftController::class, 'setLock']);

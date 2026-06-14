<?php

use App\Scheduling\Http\Controllers\ScheduleController;
use App\Scheduling\Http\Controllers\ScheduledShiftController;
use App\Scheduling\Http\Controllers\ShiftRequirementController;
use Illuminate\Support\Facades\Route;

// Schedules
Route::get('teams/{team}/schedules', [ScheduleController::class, 'index']);
Route::post('teams/{team}/schedules', [ScheduleController::class, 'store']);
Route::get('schedules/{schedule}', [ScheduleController::class, 'show']);
Route::put('schedules/{schedule}', [ScheduleController::class, 'update']);
Route::delete('schedules/{schedule}', [ScheduleController::class, 'destroy']);
Route::post('schedules/{schedule}/publish', [ScheduleController::class, 'publish']);
Route::post('schedules/{schedule}/archive', [ScheduleController::class, 'archive']);

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

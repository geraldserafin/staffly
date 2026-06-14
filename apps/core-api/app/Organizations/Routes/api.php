<?php

use App\Organizations\Http\Controllers\OrganizationController;
use Illuminate\Support\Facades\Route;

Route::post('organizations', [OrganizationController::class, 'store']);
Route::get('organizations/{organization}', [OrganizationController::class, 'show']);
Route::put('organizations/{organization}', [OrganizationController::class, 'update']);
Route::delete('organizations/{organization}', [OrganizationController::class, 'destroy']);

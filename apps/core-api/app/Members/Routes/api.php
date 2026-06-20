<?php

use App\Members\Http\Controllers\MemberController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('organizations/{organization}/members', [MemberController::class, 'index'])->middleware('permission:members.view');
    Route::post('organizations/{organization}/members', [MemberController::class, 'store'])->middleware('permission:members.create');

    Route::get('members/{member}', [MemberController::class, 'show'])->middleware('permission:members.view');
    Route::get('members/{member}/shifts', [MemberController::class, 'shifts'])->middleware('permission:members.view');
    Route::put('members/{member}', [MemberController::class, 'update'])->middleware('permission:members.update');
    Route::delete('members/{member}', [MemberController::class, 'destroy'])->middleware('permission:members.delete');
});

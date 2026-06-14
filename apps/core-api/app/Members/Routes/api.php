<?php

use App\Members\Http\Controllers\MemberController;
use Illuminate\Support\Facades\Route;

Route::get('organizations/{organization}/members', [MemberController::class, 'index']);
Route::post('organizations/{organization}/members', [MemberController::class, 'store']);
Route::get('members/{member}', [MemberController::class, 'show']);
Route::put('members/{member}', [MemberController::class, 'update']);
Route::delete('members/{member}', [MemberController::class, 'destroy']);

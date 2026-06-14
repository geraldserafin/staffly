<?php

namespace App\Members;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class MemberServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->group(__DIR__.'/Routes/api.php');
    }
}

<?php

namespace App\Scheduling;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class SchedulingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->group(__DIR__.'/Routes/api.php');
    }
}

<?php

namespace App\Availability;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AvailabilityServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->group(__DIR__.'/Routes/api.php');
    }
}

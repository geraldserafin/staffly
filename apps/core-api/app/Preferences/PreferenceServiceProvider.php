<?php

namespace App\Preferences;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class PreferenceServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->group(__DIR__.'/Routes/api.php');
    }
}

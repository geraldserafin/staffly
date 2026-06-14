<?php

namespace App\ShiftTemplates;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class ShiftTemplateServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->group(__DIR__.'/Routes/api.php');
    }
}

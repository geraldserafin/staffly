<?php

namespace App\Skills;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class SkillServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->group(__DIR__.'/Routes/api.php');
    }
}

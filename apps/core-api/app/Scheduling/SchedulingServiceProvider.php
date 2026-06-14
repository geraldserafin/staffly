<?php

namespace App\Scheduling;

use App\Scheduling\Solver\GreedyStubSolver;
use App\Scheduling\Solver\Solver;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class SchedulingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Swap for the OR-Tools HTTP client when the Python service lands.
        $this->app->bind(Solver::class, GreedyStubSolver::class);
    }

    public function boot(): void
    {
        Route::middleware('api')->group(__DIR__.'/Routes/api.php');
    }
}

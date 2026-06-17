<?php

namespace App\Scheduling;

use App\Scheduling\Solver\HttpSolver;
use App\Scheduling\Solver\Solver;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class SchedulingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(HttpSolver::class, fn () => new HttpSolver(
            (string) config('solver.url'),
            (int) config('solver.timeout'),
        ));

        // The solver is the Python OR-Tools service.
        $this->app->bind(Solver::class, fn ($app) => $app->make(HttpSolver::class));
    }

    public function boot(): void
    {
        Route::middleware('api')->group(__DIR__.'/Routes/api.php');
    }
}

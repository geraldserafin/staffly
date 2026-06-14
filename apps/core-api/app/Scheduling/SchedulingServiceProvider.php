<?php

namespace App\Scheduling;

use App\Scheduling\Solver\GreedyStubSolver;
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

        // SOLVER_DRIVER=http routes to the Python OR-Tools service; default stub.
        $this->app->bind(Solver::class, fn ($app) => config('solver.driver') === 'http'
            ? $app->make(HttpSolver::class)
            : $app->make(GreedyStubSolver::class));
    }

    public function boot(): void
    {
        Route::middleware('api')->group(__DIR__.'/Routes/api.php');
    }
}

<?php

namespace App\Teams;

use App\Organizations\Events\OrganizationCreated;
use App\Teams\Listeners\CreateDefaultTeam;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class TeamServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->group(__DIR__.'/Routes/api.php');

        Event::listen(OrganizationCreated::class, CreateDefaultTeam::class);
    }
}

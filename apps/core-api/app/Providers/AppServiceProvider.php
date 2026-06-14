<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Models and factories both live in the slice: App\<Slice>\Models\<Name>
        // resolves to App\<Slice>\Factories\<Name>Factory.
        Factory::guessFactoryNamesUsing(
            fn (string $modelName) => str_replace('\\Models\\', '\\Factories\\', $modelName).'Factory'
        );
    }
}

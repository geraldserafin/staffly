<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: '',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Render all exceptions (including 404s) as JSON, never HTML.
        $exceptions->shouldRenderJsonWhen(fn () => true);

        // Clean, stable 404 body that never leaks internals, even with APP_DEBUG=true.
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            return response()->json(['message' => 'Not Found'], 404);
        });

        // Map other HTTP exceptions to their status with a plain message.
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            return response()->json(
                ['message' => $e->getMessage() ?: 'Error'],
                $e->getStatusCode(),
            );
        });
    })->create();

<?php

use App\Auth\Middleware\SetPermissionTeam;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
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
        $middleware->appendToGroup('api', SetPermissionTeam::class);

        $middleware->alias([
            'permission-team' => SetPermissionTeam::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Render all exceptions (including 404s) as JSON, never HTML.
        $exceptions->shouldRenderJsonWhen(fn () => true);

        // Unauthenticated → 401 (must come before the Throwable catch-all,
        // otherwise Sanctum's auth failures get masked as 500).
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        });

        // Clean, stable 404 body that never leaks internals, even with APP_DEBUG=true.
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            return response()->json(['message' => 'Not Found'], 404);
        });

        // Map HTTP exceptions to their status with a plain message.
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            return response()->json(
                ['message' => $e->getMessage() ?: 'Error'],
                $e->getStatusCode(),
            );
        });

        // Validation errors → 422 with field-level errors.
        $exceptions->render(function (ValidationException $e, Request $request) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        });

        // Catch-all: any other exception (DB errors, etc.) gets a generic 500
        // that never leaks SQL queries, stack traces, or internal details.
        $exceptions->render(function (\Throwable $e, Request $request) {
            $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;

            return response()->json(
                ['message' => $status >= 500 ? 'Server error' : ($e->getMessage() ?: 'Error')],
                $status,
            );
        });
    })->create();

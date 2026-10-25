<?php

use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\AuthenticateSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);

        // A session ends once its user's password changes elsewhere (e.g. an admin reset);
        // the user's own session is kept because the new password hash is stored after the request
        $middleware->web(append: [AuthenticateSession::class]);

        // The SPA has no login route: signed-out browser requests go to the start page (API requests get JSON 401)
        $middleware->redirectGuestsTo('/');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API routes and the public JSON data routes always answer errors with JSON (e.g. 422 or 401
        // instead of a redirect or an HTML page), even when the request sent no Accept header
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->expectsJson() || $request->is(
            'api/*', 'suitability', 'suitability/*', 'reforestation', 'reforestation/*',
            'barangays', 'barangays/*', 'environmental/*', 'zoning/*',
        ));
    })->create();

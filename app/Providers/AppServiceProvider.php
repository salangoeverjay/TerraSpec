<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Brute-force protection for the LGU login: 5 attempts per minute per email + IP
        RateLimiter::for('lgu-login', function (Request $request) {
            return Limit::perMinute(5)
                ->by(Str::lower((string) $request->input('email')).'|'.$request->ip())
                ->response(fn () => response()->json([
                    'message' => 'Too many login attempts. Please wait a minute and try again.',
                ], 429));
        });

        // Public limits count per signed-in user, else per IP, so CPDO staff behind one office IP don't share them

        // Public PDF reports are the costliest: 10 per minute
        RateLimiter::for('heavy', function (Request $request) {
            return Limit::perMinute(10)
                ->by((string) ($request->user()?->id ?? $request->ip()))
                ->response(fn () => response()->json([
                    'message' => 'Too many report downloads. Please wait a minute and try again.',
                ], 429));
        });

        // Four-method comparison and sensitivity: the Suitability page asks for both on every land-use
        // switch, so 30 per minute covers clicking through all five land uses several times
        RateLimiter::for('analysis', function (Request $request) {
            return Limit::perMinute(30)
                ->by((string) ($request->user()?->id ?? $request->ip()))
                ->response(fn () => response()->json([
                    'message' => 'Too many analyses in a minute. Please wait a minute and try again.',
                ], 429));
        });

        // Other public data routes: generous for normal browsing, still bounded
        RateLimiter::for('public', function (Request $request) {
            return Limit::perMinute(60)
                ->by((string) ($request->user()?->id ?? $request->ip()))
                ->response(fn () => response()->json([
                    'message' => 'Too many requests. Please wait a minute and try again.',
                ], 429));
        });

        // The AI chat shares one Gemini quota: 20 questions per minute per signed-in user or IP
        RateLimiter::for('chatbot', function (Request $request) {
            return Limit::perMinute(20)
                ->by((string) ($request->user()?->id ?? $request->ip()))
                ->response(fn () => response()->json([
                    'message' => 'You are sending questions too quickly. Please wait a minute and try again.',
                ], 429));
        });
    }
}

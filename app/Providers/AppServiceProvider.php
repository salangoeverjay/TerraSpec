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

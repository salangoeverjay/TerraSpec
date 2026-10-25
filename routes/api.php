<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AhpController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\DashboardStatsController;
use App\Http\Controllers\LguAuthController;
use App\Http\Controllers\MapQueryController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::post('/chatbot', ChatbotController::class)->middleware('throttle:chatbot');
Route::post('/map/interpret', MapQueryController::class)->middleware('throttle:30,1');
Route::get('/dashboard-stats', DashboardStatsController::class);

// LGU login and admin API: session cookies + CSRF protection (web middleware), checked on the server.
Route::middleware('web')->group(function () {
    Route::post('/lgu/login', [LguAuthController::class, 'login'])->middleware('throttle:lgu-login');
    Route::post('/lgu/logout', [LguAuthController::class, 'logout']);
    Route::get('/lgu/me', [LguAuthController::class, 'me']);
    Route::post('/lgu/password', [LguAuthController::class, 'changePassword'])->middleware('auth');

    // CPDO staff (admin and planner) manage the planning data and AHP weights, and the reports
    Route::middleware('role:admin,planner')->group(function () {
        Route::get('/reports', [ReportController::class, 'archive']);
        // POST: generating saves a report and calls Gemini, so it needs CSRF protection and a limit
        Route::post('/reports/generate', [ReportController::class, 'generate'])->middleware('throttle:10,1');

        Route::prefix('admin/ahp')->group(function () {
            Route::post('/compute', [AhpController::class, 'compute']);
            Route::post('/apply', [AhpController::class, 'apply']);
        });

        Route::prefix('admin')->group(function () {
            Route::get('/zones', [AdminController::class, 'zones']);
            Route::put('/zones/{id}', [AdminController::class, 'updateZone']);

            Route::get('/criteria', [AdminController::class, 'criteria']);
            Route::put('/criteria', [AdminController::class, 'updateAllCriteria']);

            Route::get('/restrictions', [AdminController::class, 'restrictions']);
            Route::post('/restrictions', [AdminController::class, 'storeRestriction']);
            Route::put('/restrictions/{id}', [AdminController::class, 'updateRestriction']);
            Route::delete('/restrictions/{id}', [AdminController::class, 'deleteRestriction']);

            Route::get('/species', [AdminController::class, 'species']);
            Route::post('/species', [AdminController::class, 'storeSpecies']);
            Route::put('/species/{id}', [AdminController::class, 'updateSpecies']);
            Route::delete('/species/{id}', [AdminController::class, 'deleteSpecies']);
        });
    });

    // Only administrators manage user accounts
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/users', [AdminController::class, 'users']);
        Route::post('/users', [AdminController::class, 'storeUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
    });
});

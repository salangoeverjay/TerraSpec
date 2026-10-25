<?php

use App\Http\Controllers\BarangayProfileController;
use App\Http\Controllers\EnvironmentalController;
use App\Http\Controllers\ReforestationController;
use App\Http\Controllers\SuitabilityController;
use App\Http\Controllers\ZoningQueryController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Public data for the map and analysis screens: 60 requests per minute per visitor
Route::middleware('throttle:public')->group(function () {
    Route::get('/barangays', [BarangayProfileController::class, 'index']);
    Route::get('/barangays/{id}/profile', [BarangayProfileController::class, 'show'])->whereNumber('id');

    Route::get('/zoning/query', ZoningQueryController::class);

    Route::get('/environmental/summary', [EnvironmentalController::class, 'summary']);

    Route::prefix('reforestation')->group(function () {
        Route::get('/', [ReforestationController::class, 'index']);
        Route::get('/sites', [ReforestationController::class, 'sites']);
        Route::get('/{id}/match', [ReforestationController::class, 'getMatches'])->whereNumber('id');
        Route::get('/{id}/report', [ReforestationController::class, 'report'])->whereNumber('id');
    });

    Route::prefix('suitability')->group(function () {
        Route::get('/', [SuitabilityController::class, 'index']);
        Route::get('/rankings', [SuitabilityController::class, 'rankings']);
        Route::get('/summary', [SuitabilityController::class, 'summary']);
        Route::get('/breakdown', [SuitabilityController::class, 'breakdown']);
        Route::get('/{id}', [SuitabilityController::class, 'show'])->whereNumber('id');
    });
});

// PDF reports are the costliest: 10 per minute per visitor
Route::middleware('throttle:heavy')->group(function () {
    Route::get('/environmental/report', [EnvironmentalController::class, 'report']);
    Route::get('/reforestation/{id}/pdf', [ReforestationController::class, 'pdf'])->whereNumber('id');
});

// Four-method comparison and sensitivity, loaded on every land-use switch: 30 per minute per visitor
Route::middleware('throttle:analysis')->group(function () {
    Route::get('/suitability/compare', [SuitabilityController::class, 'compare']);
    Route::get('/suitability/sensitivity', [SuitabilityController::class, 'sensitivity']);
});

// Saving analysis runs changes the stored rankings, so only CPDO staff may do it
Route::middleware(['role:admin,planner', 'throttle:10,1'])->prefix('suitability')->group(function () {
    Route::post('/calculate', [SuitabilityController::class, 'calculate']);
    Route::post('/nlp', [SuitabilityController::class, 'fromNlp']);
});

<?php

use App\Http\Controllers\BarangayProfileController;
use App\Http\Controllers\EnvironmentalController;
use App\Http\Controllers\ReforestationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SuitabilityController;
use App\Http\Controllers\ZoningQueryController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/barangays', [BarangayProfileController::class, 'index']);
Route::get('/barangays/{id}/profile', [BarangayProfileController::class, 'show'])->whereNumber('id');

Route::get('/zoning/query', ZoningQueryController::class);

Route::get('/environmental/summary', [EnvironmentalController::class, 'summary']);
Route::get('/environmental/report', [EnvironmentalController::class, 'report']);
Route::get('/reports/generate', [ReportController::class, 'generate']);

Route::prefix('reforestation')->group(function () {
    Route::get('/', [ReforestationController::class, 'index']);
    Route::get('/{id}/match', [ReforestationController::class, 'getMatches']);
    Route::get('/{id}/report', [ReforestationController::class, 'report']);
    Route::get('/{id}/pdf', [ReforestationController::class, 'pdf']);
});

Route::prefix('suitability')->group(function () {
    Route::get('/', [SuitabilityController::class, 'index']);
    Route::get('/rankings', [SuitabilityController::class, 'rankings']);
    Route::post('/calculate', [SuitabilityController::class, 'calculate']);
    Route::post('/nlp', [SuitabilityController::class, 'fromNlp']);
    Route::get('/compare', [SuitabilityController::class, 'compare']);
    Route::get('/sensitivity', [SuitabilityController::class, 'sensitivity']);
    Route::get('/summary', [SuitabilityController::class, 'summary']);
    Route::get('/breakdown', [SuitabilityController::class, 'breakdown']);
    Route::get('/{id}', [SuitabilityController::class, 'show']);
});

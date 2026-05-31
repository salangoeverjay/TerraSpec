<?php

use App\Http\Controllers\EnvironmentalController;
use App\Http\Controllers\ReforestationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SuitabilityController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/environmental/summary', [EnvironmentalController::class, 'summary']);
Route::get('/reports/generate', [ReportController::class, 'generate']);

Route::prefix('reforestation')->group(function () {
    Route::get('/',           [ReforestationController::class, 'index']);
    Route::get('/{id}/match', [ReforestationController::class, 'getMatches']);
    Route::get('/{id}/report',[ReforestationController::class, 'report']);
    Route::get('/{id}/pdf',   [ReforestationController::class, 'pdf']);
});

Route::prefix('suitability')->group(function () {
    Route::get('/',             [SuitabilityController::class, 'index']);
    Route::get('/rankings',     [SuitabilityController::class, 'rankings']);
    Route::post('/calculate',   [SuitabilityController::class, 'calculate']);
    Route::post('/nlp',         [SuitabilityController::class, 'fromNlp']);
    Route::get('/{id}',         [SuitabilityController::class, 'show']);
});

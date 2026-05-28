<?php

use App\Http\Controllers\SuitabilityController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('suitability')->group(function () {
    Route::get('/',             [SuitabilityController::class, 'index']);
    Route::get('/rankings',     [SuitabilityController::class, 'rankings']);
    Route::post('/calculate',   [SuitabilityController::class, 'calculate']);
    Route::post('/nlp',         [SuitabilityController::class, 'fromNlp']);
    Route::get('/{id}',         [SuitabilityController::class, 'show']);
});

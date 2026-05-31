<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\DashboardStatsController;
use App\Http\Controllers\LguAuthController;
use Illuminate\Support\Facades\Route;

Route::post('/chatbot', ChatbotController::class);
Route::get('/dashboard-stats', DashboardStatsController::class);
Route::post('/lgu/login', [LguAuthController::class, 'login']);
Route::post('/lgu/logout', [LguAuthController::class, 'logout']);

Route::prefix('admin')->group(function () {
    Route::get('/zones',                 [AdminController::class, 'zones']);
    Route::put('/zones/{id}',            [AdminController::class, 'updateZone']);

    Route::get('/criteria',              [AdminController::class, 'criteria']);
    Route::put('/criteria',              [AdminController::class, 'updateAllCriteria']);

    Route::get('/restrictions',          [AdminController::class, 'restrictions']);
    Route::post('/restrictions',         [AdminController::class, 'storeRestriction']);
    Route::put('/restrictions/{id}',     [AdminController::class, 'updateRestriction']);
    Route::delete('/restrictions/{id}',  [AdminController::class, 'deleteRestriction']);

    Route::get('/species',               [AdminController::class, 'species']);
    Route::post('/species',              [AdminController::class, 'storeSpecies']);
    Route::put('/species/{id}',          [AdminController::class, 'updateSpecies']);
    Route::delete('/species/{id}',       [AdminController::class, 'deleteSpecies']);

    Route::get('/users',                 [AdminController::class, 'users']);
    Route::put('/users/{id}',            [AdminController::class, 'updateUser']);
    Route::delete('/users/{id}',         [AdminController::class, 'deleteUser']);
});
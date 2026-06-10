<?php

use App\Http\Controllers\Api\V1\Academic\AcademicSessionController;
use App\Http\Controllers\Api\V1\Academic\ClassController;
use App\Http\Controllers\Api\V1\Academic\SectionController;
use App\Http\Controllers\Api\V1\Academic\SubjectController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\SchoolProfileController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| All routes are prefixed with /api (route file) + /v1 (group) => /api/v1/...
| Reusable by the React web app and future React Native apps.
*/
Route::prefix('v1')->group(function () {
    // --- Public ---
    Route::post('/auth/login', [AuthController::class, 'login']);

    // --- Authenticated (Sanctum bearer token) ---
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/dashboard', [DashboardController::class, 'index']);

        Route::get('/school-profile', [SchoolProfileController::class, 'show']);
        Route::put('/school-profile', [SchoolProfileController::class, 'update']);
        Route::post('/school-profile/logo', [SchoolProfileController::class, 'uploadLogo']);

        Route::get('/academic-sessions', [AcademicSessionController::class, 'index']);
        Route::post('/academic-sessions', [AcademicSessionController::class, 'store']);
        Route::put('/academic-sessions/{academicSession}', [AcademicSessionController::class, 'update']);
        Route::delete('/academic-sessions/{academicSession}', [AcademicSessionController::class, 'destroy']);
        Route::post('/academic-sessions/{academicSession}/set-current', [AcademicSessionController::class, 'setCurrent']);

        Route::get('/classes', [ClassController::class, 'index']);
        Route::post('/classes', [ClassController::class, 'store']);
        Route::put('/classes/{class}', [ClassController::class, 'update']);
        Route::delete('/classes/{class}', [ClassController::class, 'destroy']);

        Route::get('/sections', [SectionController::class, 'index']);
        Route::post('/sections', [SectionController::class, 'store']);
        Route::put('/sections/{section}', [SectionController::class, 'update']);
        Route::delete('/sections/{section}', [SectionController::class, 'destroy']);

        Route::get('/subjects', [SubjectController::class, 'index']);
        Route::post('/subjects', [SubjectController::class, 'store']);
        Route::put('/subjects/{subject}', [SubjectController::class, 'update']);
        Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy']);
        Route::put('/subjects/{subject}/classes', [SubjectController::class, 'syncClasses']);
    });
});

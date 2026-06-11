<?php

use App\Http\Controllers\Api\V1\Academic\AcademicSessionController;
use App\Http\Controllers\Api\V1\Academic\ClassController;
use App\Http\Controllers\Api\V1\Academic\SectionController;
use App\Http\Controllers\Api\V1\Academic\SubjectController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\Employees\EmployeeController;
use App\Http\Controllers\Api\V1\Fees\FeeController;
use App\Http\Controllers\Api\V1\Fees\FeeHeadController;
use App\Http\Controllers\Api\V1\Fees\FeePaymentController;
use App\Http\Controllers\Api\V1\Fees\FeeStructureController;
use App\Http\Controllers\Api\V1\Fees\StudentFeeController;
use App\Http\Controllers\Api\V1\Guardians\GuardianController;
use App\Http\Controllers\Api\V1\SchoolProfileController;
use App\Http\Controllers\Api\V1\Students\StudentController;
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

        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
        Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
        Route::put('/employees/{employee}/assignments', [EmployeeController::class, 'syncAssignments']);

        Route::get('/students/export', [StudentController::class, 'export']);
        Route::post('/students/promote', [StudentController::class, 'promote']);
        Route::get('/students', [StudentController::class, 'index']);
        Route::post('/students', [StudentController::class, 'store']);
        Route::get('/students/{student}', [StudentController::class, 'show']);
        Route::put('/students/{student}', [StudentController::class, 'update']);
        Route::delete('/students/{student}', [StudentController::class, 'destroy']);
        Route::post('/students/{student}/transfer', [StudentController::class, 'transfer']);
        Route::post('/students/{student}/photo', [StudentController::class, 'uploadPhoto']);
        Route::get('/students/{student}/history', [StudentController::class, 'history']);

        Route::get('/guardians', [GuardianController::class, 'index']);
        Route::post('/guardians', [GuardianController::class, 'store']);
        Route::get('/guardians/{guardian}', [GuardianController::class, 'show']);
        Route::put('/guardians/{guardian}', [GuardianController::class, 'update']);
        Route::delete('/guardians/{guardian}', [GuardianController::class, 'destroy']);
        Route::put('/guardians/{guardian}/students', [GuardianController::class, 'syncStudents']);
        Route::post('/guardians/{guardian}/reset-password', [GuardianController::class, 'resetPassword']);

        // --- Fees: configuration ---
        Route::get('/fee-heads', [FeeHeadController::class, 'index']);
        Route::post('/fee-heads', [FeeHeadController::class, 'store']);
        Route::get('/fee-heads/{feeHead}', [FeeHeadController::class, 'show']);
        Route::put('/fee-heads/{feeHead}', [FeeHeadController::class, 'update']);
        Route::delete('/fee-heads/{feeHead}', [FeeHeadController::class, 'destroy']);

        Route::get('/fee-structures', [FeeStructureController::class, 'index']);
        Route::post('/fee-structures', [FeeStructureController::class, 'store']);
        Route::get('/fee-structures/{feeStructure}', [FeeStructureController::class, 'show']);
        Route::put('/fee-structures/{feeStructure}', [FeeStructureController::class, 'update']);
        Route::delete('/fee-structures/{feeStructure}', [FeeStructureController::class, 'destroy']);

        // --- Fees: student plans + collection ---
        Route::get('/fees/students', [FeeController::class, 'studentsIndex']);
        Route::get('/fees/students/{student}', [StudentFeeController::class, 'show']);
        Route::post('/fees/students/{student}/assign', [StudentFeeController::class, 'assign']);
        Route::put('/fees/students/{student}/items', [StudentFeeController::class, 'updateItems']);
        Route::post('/fees/students/{student}/cancel', [StudentFeeController::class, 'cancel']);

        Route::get('/fee-payments', [FeePaymentController::class, 'index']);
        Route::post('/fee-payments', [FeePaymentController::class, 'store']);
        Route::get('/fee-payments/{feePayment}', [FeePaymentController::class, 'show']);
        Route::post('/fee-payments/{feePayment}/void', [FeePaymentController::class, 'void']);
    });
});

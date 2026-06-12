<?php

use App\Http\Controllers\Api\V1\Academic\AcademicSessionController;
use App\Http\Controllers\Api\V1\Academic\ClassController;
use App\Http\Controllers\Api\V1\Academic\SectionController;
use App\Http\Controllers\Api\V1\Academic\SubjectController;
use App\Http\Controllers\Api\V1\Attendance\AttendanceController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\Employees\EmployeeController;
use App\Http\Controllers\Api\V1\Exams\ExamController;
use App\Http\Controllers\Api\V1\Exams\ExamMarkController;
use App\Http\Controllers\Api\V1\Exams\ExamResultController;
use App\Http\Controllers\Api\V1\Exams\ExamScheduleController;
use App\Http\Controllers\Api\V1\Fees\FeeController;
use App\Http\Controllers\Api\V1\Fees\FeeHeadController;
use App\Http\Controllers\Api\V1\Fees\FeePaymentController;
use App\Http\Controllers\Api\V1\Fees\FeeStructureController;
use App\Http\Controllers\Api\V1\Fees\StudentFeeController;
use App\Http\Controllers\Api\V1\Guardians\GuardianController;
use App\Http\Controllers\Api\V1\Learning\HomeworkAssignmentController;
use App\Http\Controllers\Api\V1\Learning\StudyMaterialController;
use App\Http\Controllers\Api\V1\Notices\NoticeController;
use App\Http\Controllers\Api\V1\Reports\AuditLogController;
use App\Http\Controllers\Api\V1\Reports\ReportController;
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
        Route::get('/reports/overview', [ReportController::class, 'overview']);
        Route::get('/reports/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/reports/audit-logs/summary', [AuditLogController::class, 'summary']);

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

        Route::get('/attendance/sessions', [AttendanceController::class, 'index']);
        Route::get('/attendance/roster', [AttendanceController::class, 'roster']);
        Route::post('/attendance/sessions', [AttendanceController::class, 'store']);
        Route::get('/attendance/reports/summary', [AttendanceController::class, 'summary']);
        Route::get('/attendance/sessions/{attendanceSession}', [AttendanceController::class, 'show']);

        Route::get('/homework', [HomeworkAssignmentController::class, 'index']);
        Route::post('/homework', [HomeworkAssignmentController::class, 'store']);
        Route::get('/homework/{homeworkAssignment}', [HomeworkAssignmentController::class, 'show']);
        Route::put('/homework/{homeworkAssignment}', [HomeworkAssignmentController::class, 'update']);
        Route::delete('/homework/{homeworkAssignment}', [HomeworkAssignmentController::class, 'destroy']);
        Route::post('/homework/{homeworkAssignment}/attachment', [HomeworkAssignmentController::class, 'uploadAttachment']);

        Route::get('/study-materials', [StudyMaterialController::class, 'index']);
        Route::post('/study-materials', [StudyMaterialController::class, 'store']);
        Route::get('/study-materials/{studyMaterial}', [StudyMaterialController::class, 'show']);
        Route::put('/study-materials/{studyMaterial}', [StudyMaterialController::class, 'update']);
        Route::delete('/study-materials/{studyMaterial}', [StudyMaterialController::class, 'destroy']);
        Route::post('/study-materials/{studyMaterial}/attachment', [StudyMaterialController::class, 'uploadAttachment']);

        Route::get('/notices', [NoticeController::class, 'index']);
        Route::post('/notices', [NoticeController::class, 'store']);
        Route::get('/notices/{notice}', [NoticeController::class, 'show']);
        Route::put('/notices/{notice}', [NoticeController::class, 'update']);
        Route::delete('/notices/{notice}', [NoticeController::class, 'destroy']);
        Route::post('/notices/{notice}/attachment', [NoticeController::class, 'uploadAttachment']);
        Route::post('/notices/{notice}/read', [NoticeController::class, 'markRead']);
        Route::get('/notices/{notice}/delivery', [NoticeController::class, 'delivery']);

        Route::get('/exams', [ExamController::class, 'index']);
        Route::post('/exams', [ExamController::class, 'store']);
        Route::get('/exams/{exam}', [ExamController::class, 'show']);
        Route::put('/exams/{exam}', [ExamController::class, 'update']);
        Route::delete('/exams/{exam}', [ExamController::class, 'destroy']);

        Route::get('/exam-schedules', [ExamScheduleController::class, 'index']);
        Route::post('/exam-schedules', [ExamScheduleController::class, 'store']);
        Route::get('/exam-schedules/{examSchedule}', [ExamScheduleController::class, 'show']);
        Route::put('/exam-schedules/{examSchedule}', [ExamScheduleController::class, 'update']);
        Route::delete('/exam-schedules/{examSchedule}', [ExamScheduleController::class, 'destroy']);
        Route::get('/exam-schedules/{examSchedule}/marks', [ExamMarkController::class, 'roster']);
        Route::put('/exam-schedules/{examSchedule}/marks', [ExamMarkController::class, 'update']);

        Route::get('/exams/{exam}/results', [ExamResultController::class, 'index']);
        Route::post('/exams/{exam}/results/publish', [ExamResultController::class, 'publish']);
        Route::post('/exams/{exam}/results/unpublish', [ExamResultController::class, 'unpublish']);
        Route::get('/exams/{exam}/students/{student}/result', [ExamResultController::class, 'show']);

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

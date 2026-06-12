<?php

use App\Http\Controllers\Api\V1\Academic\AcademicSessionController;
use App\Http\Controllers\Api\V1\Academic\ClassController;
use App\Http\Controllers\Api\V1\Academic\SectionController;
use App\Http\Controllers\Api\V1\Academic\SubjectController;
use App\Http\Controllers\Api\V1\Access\PermissionController;
use App\Http\Controllers\Api\V1\Access\RoleController;
use App\Http\Controllers\Api\V1\Access\UserAccessController;
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
|
| Access control: the `permission:<key>` middleware (App\Http\Middleware\
| EnsurePermission) gates each route. Owner roles + platform super admin
| bypass automatically. Teacher data-scoping (assigned classes) stays in the
| services — it is orthogonal to these module/action permissions.
*/
Route::prefix('v1')->group(function () {
    // --- Public ---
    Route::post('/auth/login', [AuthController::class, 'login']);

    // --- Authenticated (Sanctum bearer token) ---
    Route::middleware('auth:sanctum')->group(function () {
        // Always available to any authenticated user.
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('permission:dashboard.view');

        // --- Reports & audit logs ---
        Route::get('/reports/overview', [ReportController::class, 'overview'])->middleware('permission:reports.view');
        Route::get('/reports/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:reports.view');
        Route::get('/reports/audit-logs/summary', [AuditLogController::class, 'summary'])->middleware('permission:reports.view');

        // --- Roles & permissions (RBAC) ---
        Route::get('/access/permissions', [PermissionController::class, 'index'])->middleware('permission:access.view');
        Route::get('/access/roles', [RoleController::class, 'index'])->middleware('permission:access.view');
        Route::get('/access/roles/{role}', [RoleController::class, 'show'])->middleware('permission:access.view');
        Route::post('/access/roles', [RoleController::class, 'store'])->middleware('permission:access.manage');
        Route::put('/access/roles/{role}', [RoleController::class, 'update'])->middleware('permission:access.manage');
        Route::delete('/access/roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:access.manage');
        Route::get('/access/users/{user}', [UserAccessController::class, 'show'])->middleware('permission:access.view');
        Route::put('/access/users/{user}', [UserAccessController::class, 'update'])->middleware('permission:access.manage');
        Route::post('/access/users/{user}/reset-password', [UserAccessController::class, 'resetPassword'])->middleware('permission:access.manage');
        Route::put('/access/users/{user}/status', [UserAccessController::class, 'updateStatus'])->middleware('permission:access.manage');

        // --- School profile / settings ---
        Route::get('/school-profile', [SchoolProfileController::class, 'show'])->middleware('permission:settings.view');
        Route::put('/school-profile', [SchoolProfileController::class, 'update'])->middleware('permission:settings.update');
        Route::post('/school-profile/logo', [SchoolProfileController::class, 'uploadLogo'])->middleware('permission:settings.update');

        // --- Academic setup ---
        Route::get('/academic-sessions', [AcademicSessionController::class, 'index'])->middleware('permission:academic.view');
        Route::post('/academic-sessions', [AcademicSessionController::class, 'store'])->middleware('permission:academic.create');
        Route::put('/academic-sessions/{academicSession}', [AcademicSessionController::class, 'update'])->middleware('permission:academic.update');
        Route::delete('/academic-sessions/{academicSession}', [AcademicSessionController::class, 'destroy'])->middleware('permission:academic.delete');
        Route::post('/academic-sessions/{academicSession}/set-current', [AcademicSessionController::class, 'setCurrent'])->middleware('permission:academic.update');

        Route::get('/classes', [ClassController::class, 'index'])->middleware('permission:academic.view');
        Route::post('/classes', [ClassController::class, 'store'])->middleware('permission:academic.create');
        Route::put('/classes/{class}', [ClassController::class, 'update'])->middleware('permission:academic.update');
        Route::delete('/classes/{class}', [ClassController::class, 'destroy'])->middleware('permission:academic.delete');

        Route::get('/sections', [SectionController::class, 'index'])->middleware('permission:academic.view');
        Route::post('/sections', [SectionController::class, 'store'])->middleware('permission:academic.create');
        Route::put('/sections/{section}', [SectionController::class, 'update'])->middleware('permission:academic.update');
        Route::delete('/sections/{section}', [SectionController::class, 'destroy'])->middleware('permission:academic.delete');

        Route::get('/subjects', [SubjectController::class, 'index'])->middleware('permission:academic.view');
        Route::post('/subjects', [SubjectController::class, 'store'])->middleware('permission:academic.create');
        Route::put('/subjects/{subject}', [SubjectController::class, 'update'])->middleware('permission:academic.update');
        Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy'])->middleware('permission:academic.delete');
        Route::put('/subjects/{subject}/classes', [SubjectController::class, 'syncClasses'])->middleware('permission:academic.update');

        // --- Employees / Teachers & Staff ---
        Route::get('/employees', [EmployeeController::class, 'index'])->middleware('permission:employees.view');
        Route::post('/employees', [EmployeeController::class, 'store'])->middleware('permission:employees.create');
        Route::get('/employees/{employee}', [EmployeeController::class, 'show'])->middleware('permission:employees.view');
        Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->middleware('permission:employees.update');
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('permission:employees.delete');
        Route::put('/employees/{employee}/assignments', [EmployeeController::class, 'syncAssignments'])->middleware('permission:employees.update');

        // --- Students ---
        Route::get('/students/export', [StudentController::class, 'export'])->middleware('permission:students.export');
        Route::post('/students/promote', [StudentController::class, 'promote'])->middleware('permission:students.update');
        Route::get('/students', [StudentController::class, 'index'])->middleware('permission:students.view');
        Route::post('/students', [StudentController::class, 'store'])->middleware('permission:students.create');
        Route::get('/students/{student}', [StudentController::class, 'show'])->middleware('permission:students.view');
        Route::put('/students/{student}', [StudentController::class, 'update'])->middleware('permission:students.update');
        Route::delete('/students/{student}', [StudentController::class, 'destroy'])->middleware('permission:students.delete');
        Route::post('/students/{student}/transfer', [StudentController::class, 'transfer'])->middleware('permission:students.update');
        Route::post('/students/{student}/photo', [StudentController::class, 'uploadPhoto'])->middleware('permission:students.update');
        Route::get('/students/{student}/history', [StudentController::class, 'history'])->middleware('permission:students.view');

        // --- Attendance (teacher data-scoping enforced in the service) ---
        Route::get('/attendance/sessions', [AttendanceController::class, 'index'])->middleware('permission:attendance.view');
        Route::get('/attendance/roster', [AttendanceController::class, 'roster'])->middleware('permission:attendance.view');
        Route::post('/attendance/sessions', [AttendanceController::class, 'store'])->middleware('permission:attendance.create');
        Route::get('/attendance/reports/summary', [AttendanceController::class, 'summary'])->middleware('permission:attendance.view');
        Route::get('/attendance/sessions/{attendanceSession}', [AttendanceController::class, 'show'])->middleware('permission:attendance.view');

        // --- Homework & study material ---
        Route::get('/homework', [HomeworkAssignmentController::class, 'index'])->middleware('permission:learning.view');
        Route::post('/homework', [HomeworkAssignmentController::class, 'store'])->middleware('permission:learning.create');
        Route::get('/homework/{homeworkAssignment}', [HomeworkAssignmentController::class, 'show'])->middleware('permission:learning.view');
        Route::put('/homework/{homeworkAssignment}', [HomeworkAssignmentController::class, 'update'])->middleware('permission:learning.update');
        Route::delete('/homework/{homeworkAssignment}', [HomeworkAssignmentController::class, 'destroy'])->middleware('permission:learning.delete');
        Route::post('/homework/{homeworkAssignment}/attachment', [HomeworkAssignmentController::class, 'uploadAttachment'])->middleware('permission:learning.update');

        Route::get('/study-materials', [StudyMaterialController::class, 'index'])->middleware('permission:learning.view');
        Route::post('/study-materials', [StudyMaterialController::class, 'store'])->middleware('permission:learning.create');
        Route::get('/study-materials/{studyMaterial}', [StudyMaterialController::class, 'show'])->middleware('permission:learning.view');
        Route::put('/study-materials/{studyMaterial}', [StudyMaterialController::class, 'update'])->middleware('permission:learning.update');
        Route::delete('/study-materials/{studyMaterial}', [StudyMaterialController::class, 'destroy'])->middleware('permission:learning.delete');
        Route::post('/study-materials/{studyMaterial}/attachment', [StudyMaterialController::class, 'uploadAttachment'])->middleware('permission:learning.update');

        // --- Notices ---
        // The read feed (index/show/read) is open to any authenticated user; the
        // controller scopes visibility (staff see targeted notices, parents see
        // their children's). Management + delivery insight are permission-gated.
        Route::get('/notices', [NoticeController::class, 'index']);
        Route::get('/notices/{notice}', [NoticeController::class, 'show']);
        Route::post('/notices/{notice}/read', [NoticeController::class, 'markRead']);
        Route::post('/notices', [NoticeController::class, 'store'])->middleware('permission:notices.create');
        Route::put('/notices/{notice}', [NoticeController::class, 'update'])->middleware('permission:notices.update');
        Route::delete('/notices/{notice}', [NoticeController::class, 'destroy'])->middleware('permission:notices.delete');
        Route::post('/notices/{notice}/attachment', [NoticeController::class, 'uploadAttachment'])->middleware('permission:notices.update');
        Route::get('/notices/{notice}/delivery', [NoticeController::class, 'delivery'])->middleware('permission:notices.update');

        // --- Exams, schedules, marks, results ---
        Route::get('/exams', [ExamController::class, 'index'])->middleware('permission:exams.view');
        Route::post('/exams', [ExamController::class, 'store'])->middleware('permission:exams.create');
        Route::get('/exams/{exam}', [ExamController::class, 'show'])->middleware('permission:exams.view');
        Route::put('/exams/{exam}', [ExamController::class, 'update'])->middleware('permission:exams.update');
        Route::delete('/exams/{exam}', [ExamController::class, 'destroy'])->middleware('permission:exams.delete');

        Route::get('/exam-schedules', [ExamScheduleController::class, 'index'])->middleware('permission:exams.view');
        Route::post('/exam-schedules', [ExamScheduleController::class, 'store'])->middleware('permission:exams.create');
        Route::get('/exam-schedules/{examSchedule}', [ExamScheduleController::class, 'show'])->middleware('permission:exams.view');
        Route::put('/exam-schedules/{examSchedule}', [ExamScheduleController::class, 'update'])->middleware('permission:exams.update');
        Route::delete('/exam-schedules/{examSchedule}', [ExamScheduleController::class, 'destroy'])->middleware('permission:exams.delete');
        Route::get('/exam-schedules/{examSchedule}/marks', [ExamMarkController::class, 'roster'])->middleware('permission:exams.marks');
        Route::put('/exam-schedules/{examSchedule}/marks', [ExamMarkController::class, 'update'])->middleware('permission:exams.marks');

        Route::get('/exams/{exam}/results', [ExamResultController::class, 'index'])->middleware('permission:exams.view');
        Route::post('/exams/{exam}/results/publish', [ExamResultController::class, 'publish'])->middleware('permission:exams.publish');
        Route::post('/exams/{exam}/results/unpublish', [ExamResultController::class, 'unpublish'])->middleware('permission:exams.publish');
        Route::get('/exams/{exam}/students/{student}/result', [ExamResultController::class, 'show'])->middleware('permission:exams.view');

        // --- Guardians ---
        Route::get('/guardians', [GuardianController::class, 'index'])->middleware('permission:guardians.view');
        Route::post('/guardians', [GuardianController::class, 'store'])->middleware('permission:guardians.create');
        Route::get('/guardians/{guardian}', [GuardianController::class, 'show'])->middleware('permission:guardians.view');
        Route::put('/guardians/{guardian}', [GuardianController::class, 'update'])->middleware('permission:guardians.update');
        Route::delete('/guardians/{guardian}', [GuardianController::class, 'destroy'])->middleware('permission:guardians.delete');
        Route::put('/guardians/{guardian}/students', [GuardianController::class, 'syncStudents'])->middleware('permission:guardians.update');
        Route::post('/guardians/{guardian}/reset-password', [GuardianController::class, 'resetPassword'])->middleware('permission:guardians.update');

        // --- Fees: configuration ---
        Route::get('/fee-heads', [FeeHeadController::class, 'index'])->middleware('permission:fees.view');
        Route::post('/fee-heads', [FeeHeadController::class, 'store'])->middleware('permission:fees.create');
        Route::get('/fee-heads/{feeHead}', [FeeHeadController::class, 'show'])->middleware('permission:fees.view');
        Route::put('/fee-heads/{feeHead}', [FeeHeadController::class, 'update'])->middleware('permission:fees.update');
        Route::delete('/fee-heads/{feeHead}', [FeeHeadController::class, 'destroy'])->middleware('permission:fees.delete');

        Route::get('/fee-structures', [FeeStructureController::class, 'index'])->middleware('permission:fees.view');
        Route::post('/fee-structures', [FeeStructureController::class, 'store'])->middleware('permission:fees.create');
        Route::get('/fee-structures/{feeStructure}', [FeeStructureController::class, 'show'])->middleware('permission:fees.view');
        Route::put('/fee-structures/{feeStructure}', [FeeStructureController::class, 'update'])->middleware('permission:fees.update');
        Route::delete('/fee-structures/{feeStructure}', [FeeStructureController::class, 'destroy'])->middleware('permission:fees.delete');

        // --- Fees: student plans + collection ---
        Route::get('/fees/students', [FeeController::class, 'studentsIndex'])->middleware('permission:fees.view');
        Route::get('/fees/students/{student}', [StudentFeeController::class, 'show'])->middleware('permission:fees.view');
        Route::post('/fees/students/{student}/assign', [StudentFeeController::class, 'assign'])->middleware('permission:fees.create');
        Route::put('/fees/students/{student}/items', [StudentFeeController::class, 'updateItems'])->middleware('permission:fees.update');
        Route::post('/fees/students/{student}/cancel', [StudentFeeController::class, 'cancel'])->middleware('permission:fees.update');

        Route::get('/fee-payments', [FeePaymentController::class, 'index'])->middleware('permission:fees.view');
        Route::post('/fee-payments', [FeePaymentController::class, 'store'])->middleware('permission:fees.collect');
        Route::get('/fee-payments/{feePayment}', [FeePaymentController::class, 'show'])->middleware('permission:fees.view');
        Route::post('/fee-payments/{feePayment}/void', [FeePaymentController::class, 'void'])->middleware('permission:fees.collect');
    });
});

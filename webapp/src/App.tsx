import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '@/features/marketing/HomePage'
import LoginPage from '@/features/auth/LoginPage'
import ProtectedRoute from '@/features/auth/ProtectedRoute'
import RequirePermission from '@/features/auth/RequirePermission'
import AdminLayout from '@/features/admin/AdminLayout'
import DashboardPage from '@/features/admin/dashboard/DashboardPage'
import SchoolProfilePage from '@/features/admin/school-profile/SchoolProfilePage'
import AcademicSetupPage from '@/features/admin/academic-setup/AcademicSetupPage'
import EmployeePage from '@/features/admin/employees/EmployeePage'
import StudentPage from '@/features/admin/students/StudentPage'
import GuardianPage from '@/features/admin/guardians/GuardianPage'
import FeesPage from '@/features/admin/fees/FeesPage'
import AttendancePage from '@/features/admin/attendance/AttendancePage'
import LearningPage from '@/features/admin/learning/LearningPage'
import ExamsPage from '@/features/admin/exams/ExamsPage'
import TimetablePage from '@/features/admin/timetable/TimetablePage'
import NoticesPage from '@/features/admin/notices/NoticesPage'
import ReportsPage from '@/features/admin/reports/ReportsPage'
import AccessPage from '@/features/admin/access/AccessPage'
import PlatformRoot from '@/features/platform/PlatformRoot'
import PlatformLoginPage from '@/features/platform/auth/PlatformLoginPage'
import PlatformProtectedRoute from '@/features/platform/auth/PlatformProtectedRoute'
import PlatformLayout from '@/features/platform/PlatformLayout'
import PlatformDashboardPage from '@/features/platform/dashboard/PlatformDashboardPage'
import SchoolsPage from '@/features/platform/schools/SchoolsPage'

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* School Admin (authenticated) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="settings"
            element={<RequirePermission permission="settings.view"><SchoolProfilePage /></RequirePermission>}
          />
          <Route
            path="academic-setup"
            element={<RequirePermission permission="academic.view"><AcademicSetupPage /></RequirePermission>}
          />
          <Route
            path="employees"
            element={<RequirePermission permission="employees.view"><EmployeePage /></RequirePermission>}
          />
          <Route
            path="students"
            element={<RequirePermission permission="students.view"><StudentPage /></RequirePermission>}
          />
          <Route
            path="guardians"
            element={<RequirePermission permission="guardians.view"><GuardianPage /></RequirePermission>}
          />
          <Route
            path="attendance"
            element={<RequirePermission permission="attendance.view"><AttendancePage /></RequirePermission>}
          />
          <Route
            path="fees"
            element={<RequirePermission permission="fees.view"><FeesPage /></RequirePermission>}
          />
          <Route
            path="learning"
            element={<RequirePermission permission="learning.view"><LearningPage /></RequirePermission>}
          />
          <Route
            path="exams"
            element={<RequirePermission permission="exams.view"><ExamsPage /></RequirePermission>}
          />
          <Route
            path="timetable"
            element={<RequirePermission permission="timetables.view"><TimetablePage /></RequirePermission>}
          />
          <Route
            path="notices"
            element={<RequirePermission permission="notices.view"><NoticesPage /></RequirePermission>}
          />
          <Route
            path="reports"
            element={<RequirePermission permission="reports.view"><ReportsPage /></RequirePermission>}
          />
          <Route
            path="roles"
            element={<RequirePermission permission="access.view"><AccessPage /></RequirePermission>}
          />
        </Route>
      </Route>

      {/* Platform Super Admin (isolated auth, separate token + login URL) */}
      <Route element={<PlatformRoot />}>
        <Route path="/schoollid-secure-login" element={<PlatformLoginPage />} />
        <Route element={<PlatformProtectedRoute />}>
          <Route path="/platform" element={<PlatformLayout />}>
            <Route index element={<PlatformDashboardPage />} />
            <Route path="schools" element={<SchoolsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

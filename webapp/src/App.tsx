import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '@/features/marketing/HomePage'
import LoginPage from '@/features/auth/LoginPage'
import ProtectedRoute from '@/features/auth/ProtectedRoute'
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
import NoticesPage from '@/features/admin/notices/NoticesPage'
import ReportsPage from '@/features/admin/reports/ReportsPage'

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
          <Route path="settings" element={<SchoolProfilePage />} />
          <Route path="academic-setup" element={<AcademicSetupPage />} />
          <Route path="employees" element={<EmployeePage />} />
          <Route path="students" element={<StudentPage />} />
          <Route path="guardians" element={<GuardianPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="learning" element={<LearningPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="notices" element={<NoticesPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

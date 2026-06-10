import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '@/features/marketing/HomePage'
import LoginPage from '@/features/auth/LoginPage'
import ProtectedRoute from '@/features/auth/ProtectedRoute'
import AdminLayout from '@/features/admin/AdminLayout'
import DashboardPage from '@/features/admin/dashboard/DashboardPage'
import SchoolProfilePage from '@/features/admin/school-profile/SchoolProfilePage'

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
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

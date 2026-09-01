import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { GymDataProvider } from '@/context/DataContext'
import { ToastProvider } from '@/context/ToastContext'
import { StaffAuthProvider } from '@/context/StaffAuthContext'
import { AdminDataProvider } from '@/context/AdminDataContext'
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute'
import { AdminProtectedRoute, AdminGuestRoute } from '@/components/AdminProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'

import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { VerifyCodePage } from '@/pages/auth/VerifyCodePage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

import { DashboardPage } from '@/pages/DashboardPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { MembershipPage } from '@/pages/MembershipPage'
import { UpgradePlanPage } from '@/pages/UpgradePlanPage'
import { BillingPage } from '@/pages/BillingPage'
import { ClassesPage } from '@/pages/ClassesPage'
import { CheckInsPage } from '@/pages/CheckInsPage'
import { MembershipCardPage } from '@/pages/MembershipCardPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { StaffLoginPage } from '@/pages/admin/StaffLoginPage'
import { ScannerPage } from '@/pages/admin/ScannerPage'
import { MembersPage } from '@/pages/admin/MembersPage'
import { AdminClassesPage } from '@/pages/admin/AdminClassesPage'
import { InsightsPage } from '@/pages/admin/InsightsPage'

/**
 * The member app and the staff app are two separate products sharing one
 * deployment: separate auth (AuthProvider vs StaffAuthProvider), separate
 * data scope (GymDataProvider vs AdminDataProvider), separate layout — a
 * staffer never sees member chrome and vice versa. Only ToastProvider and
 * the router are shared.
 */
function ClientApp() {
  return (
    <AuthProvider>
      <GymDataProvider>
        <Outlet />
      </GymDataProvider>
    </AuthProvider>
  )
}

function AdminApp() {
  return (
    <StaffAuthProvider>
      <AdminDataProvider>
        <Outlet />
      </AdminDataProvider>
    </StaffAuthProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Member portal */}
          <Route element={<ClientApp />}>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-code" element={<VerifyCodePage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/membership" element={<MembershipPage />} />
                <Route path="/membership/upgrade" element={<UpgradePlanPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/check-ins" element={<CheckInsPage />} />
                <Route path="/card" element={<MembershipCardPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Staff dashboard — entirely separate app, own login, own layout */}
          <Route path="/admin" element={<AdminApp />}>
            <Route element={<AdminGuestRoute />}>
              <Route path="login" element={<StaffLoginPage />} />
            </Route>

            <Route element={<AdminProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<ScannerPage />} />
                <Route path="members" element={<MembersPage />} />
                <Route path="classes" element={<AdminClassesPage />} />
                <Route path="insights" element={<InsightsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}

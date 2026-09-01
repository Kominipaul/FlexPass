import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { GymDataProvider } from '@/context/DataContext'
import { ToastProvider } from '@/context/ToastContext'
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'

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

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <GymDataProvider>
            <Routes>
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

              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </GymDataProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

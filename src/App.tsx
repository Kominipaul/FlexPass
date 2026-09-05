import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { GymDataProvider } from '@/context/DataContext'
import { ToastProvider } from '@/context/ToastContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { StaffAuthProvider } from '@/context/StaffAuthContext'
import { AdminDataProvider } from '@/context/AdminDataContext'
import { KioskProvider } from '@/context/KioskContext'
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute'
import { AdminProtectedRoute, AdminGuestRoute } from '@/components/AdminProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageLoader } from '@/components/ui/Spinner'

// Every page is loaded on demand rather than bundled into the initial chunk.
// This is what actually separates the two products at the network level: a
// member never fetches the staff dashboard's code (including the ~55KB jsQR
// decoder pulled in by the camera scanner) and a staffer never fetches the
// member portal's pages, because neither's route is ever visited.
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/pages/auth/SignupPage').then((m) => ({ default: m.SignupPage })))
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)

const CheckInPage = lazy(() => import('@/pages/CheckInPage').then((m) => ({ default: m.CheckInPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const MembershipPage = lazy(() => import('@/pages/MembershipPage').then((m) => ({ default: m.MembershipPage })))
const UpgradePlanPage = lazy(() =>
  import('@/pages/UpgradePlanPage').then((m) => ({ default: m.UpgradePlanPage })),
)
const BillingPage = lazy(() => import('@/pages/BillingPage').then((m) => ({ default: m.BillingPage })))
const ClassesPage = lazy(() => import('@/pages/ClassesPage').then((m) => ({ default: m.ClassesPage })))
const ProgressPage = lazy(() => import('@/pages/ProgressPage').then((m) => ({ default: m.ProgressPage })))
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
)
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

const StaffLoginPage = lazy(() =>
  import('@/pages/admin/StaffLoginPage').then((m) => ({ default: m.StaffLoginPage })),
)
const ScannerPage = lazy(() => import('@/pages/admin/ScannerPage').then((m) => ({ default: m.ScannerPage })))
const MembersPage = lazy(() => import('@/pages/admin/MembersPage').then((m) => ({ default: m.MembersPage })))
const AdminClassesPage = lazy(() =>
  import('@/pages/admin/AdminClassesPage').then((m) => ({ default: m.AdminClassesPage })),
)
const InsightsPage = lazy(() => import('@/pages/admin/InsightsPage').then((m) => ({ default: m.InsightsPage })))

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
        <KioskProvider>
          <Outlet />
        </KioskProvider>
      </AdminDataProvider>
    </StaffAuthProvider>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Member portal */}
              <Route element={<ClientApp />}>
                <Route element={<GuestRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    {/* Checking in is the one thing almost every visit starts with — it's the landing page, not a nav item. */}
                    <Route path="/" element={<CheckInPage />} />
                    <Route path="/home" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/membership" element={<MembershipPage />} />
                    <Route path="/membership/upgrade" element={<UpgradePlanPage />} />
                    <Route path="/billing" element={<BillingPage />} />
                    <Route path="/classes" element={<ClassesPage />} />
                    <Route path="/progress" element={<ProgressPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    {/* Legacy paths from before the redesign — kept working for old links/bookmarks. */}
                    <Route path="/card" element={<Navigate to="/" replace />} />
                    <Route path="/check-ins" element={<Navigate to="/progress" replace />} />
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
          </Suspense>
        </ToastProvider>
      </BrowserRouter>
    </LanguageProvider>
  )
}

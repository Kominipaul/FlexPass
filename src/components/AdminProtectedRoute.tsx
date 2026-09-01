import { Navigate, Outlet } from 'react-router-dom'
import { useStaffAuth } from '@/context/StaffAuthContext'
import { PageLoader } from '@/components/ui/Spinner'

/** Wraps /admin routes that require a signed-in staff session. */
export function AdminProtectedRoute() {
  const { status } = useStaffAuth()

  if (status === 'loading') {
    return <PageLoader label="Loading staff session…" />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}

/** Wraps /admin/login so a signed-in staffer doesn't see it again. */
export function AdminGuestRoute() {
  const { status } = useStaffAuth()

  if (status === 'loading') {
    return <PageLoader label="Loading…" />
  }

  if (status === 'authenticated') {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}

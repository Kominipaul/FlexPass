import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageLoader } from '@/components/ui/Spinner'

/** Wraps routes that require an authenticated session. */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <PageLoader label="Loading your account…" />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

/** Wraps auth routes (login/signup/etc.) that a signed-in user shouldn't see again. */
export function GuestRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <PageLoader label="Loading…" />
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

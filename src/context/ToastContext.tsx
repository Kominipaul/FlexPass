import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { makeId } from '@/lib/id'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: string
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const ICONS: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
}

const STYLES: Record<ToastKind, string> = {
  success: 'border-lime-300 bg-lime-50 text-lime-900',
  error: 'border-rose-300 bg-rose-50 text-rose-900',
  info: 'border-brand-200 bg-brand-50 text-brand-900',
}

const ICON_STYLES: Record<ToastKind, string> = {
  success: 'text-lime-600',
  error: 'text-rose-600',
  info: 'text-brand-600',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = makeId('toast')
      setToasts((prev) => [...prev, { id, kind, message }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* bottom-20 clears the client app's fixed mobile tab bar (see AppLayout/MobileTabBar, same lg: breakpoint); lg: and up sits in the corner as before. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto lg:bottom-4">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind]
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-pop animate-slide-in ${STYLES[toast.kind]}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_STYLES[toast.kind]}`} />
              <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-md p-0.5 text-current/60 hover:text-current"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

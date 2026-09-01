import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

interface Toast { id: string; title: string; body?: string; tone?: 'good' | 'warn' | 'bad' }
interface ToastCtx { push: (title: string, body?: string, tone?: Toast['tone']) => void }

const Ctx = createContext<ToastCtx>({ push: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const push = useCallback((title: string, body?: string, tone: Toast['tone'] = 'good') => {
    const id = Math.random().toString(36).slice(2)
    setItems((ts) => [...ts, { id, title, body, tone }])
    setTimeout(() => setItems((ts) => ts.filter((x) => x.id !== id)), 3800)
  }, [])

  const dismiss = (id: string) => setItems((ts) => ts.filter((x) => x.id !== id))

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[min(94vw,400px)] pointer-events-none">
        {items.map((t) => {
          const Icon = t.tone === 'bad' ? AlertCircle : t.tone === 'warn' ? AlertTriangle : CheckCircle2
          const color = t.tone === 'bad' ? 'text-bad' : t.tone === 'warn' ? 'text-warn' : 'text-volt'
          return (
            <div key={t.id} onClick={() => dismiss(t.id)}
              className="pointer-events-auto a-rise flex items-start gap-2.5 px-3.5 py-2.5 rounded-[9px] bg-raised border border-line shadow-lift cursor-pointer">
              <Icon size={16} className={`${color} mt-0.5`} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug">{t.title}</p>
                {t.body && <p className="text-[12px] text-dim leading-snug mt-0.5">{t.body}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

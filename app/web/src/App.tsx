import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LangContext, STR, type Lang } from './lib/i18n'
import { ToastProvider } from './components/Toasts'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { PortalLayout } from './pages/PortalLayout'
import { PassPage } from './pages/PassPage'
import { ClassesPage } from './pages/ClassesPage'
import { MembershipPage } from './pages/MembershipPage'
import type { Bilingual } from './api/types'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('el')
  const setLang = (l: Lang) => {
    setLangState(l)
    document.documentElement.lang = l // Greek uppercasing drops the tonos only when lang is set
  }
  const t = (key: string) => STR[lang][key] ?? STR.en[key] ?? key
  const tx = (v: Bilingual) => v[lang] ?? v.en
  return <LangContext.Provider value={{ lang, setLang, t, tx }}>{children}</LangContext.Provider>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  if (status === 'booting') {
    return <div className="min-h-screen grid place-items-center text-dim text-[13px]">…</div>
  }
  if (status === 'anonymous') return <Navigate to="/login" replace />
  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
                <Route path="/register" element={<RedirectIfAuthed><RegisterPage /></RedirectIfAuthed>} />
                <Route path="/" element={<RequireAuth><PortalLayout /></RequireAuth>}>
                  <Route index element={<PassPage />} />
                  <Route path="classes" element={<ClassesPage />} />
                  <Route path="account" element={<MembershipPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </LangProvider>
    </QueryClientProvider>
  )
}

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import * as client from '../api/client'
import { getMe } from '../api/endpoints'
import type { MeDTO } from '../api/types'
import type { RegisterInput } from '../api/client'

interface AuthState {
  status: 'booting' | 'authenticated' | 'anonymous'
  me: MeDTO | null
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  refetchMe: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('booting')
  const [me, setMe] = useState<MeDTO | null>(null)

  const refetchMe = useCallback(async () => {
    setMe(await getMe())
  }, [])

  useEffect(() => {
    client.setSessionLostHandler(() => {
      setMe(null)
      setStatus('anonymous')
    })
    ;(async () => {
      const session = await client.bootSession()
      if (session) {
        setMe(session.me)
        setStatus('authenticated')
      } else {
        setStatus('anonymous')
      }
    })()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await client.login(email, password)
    setMe(session.me)
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const session = await client.register(input)
    setMe(session.me)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await client.logout()
    setMe(null)
    setStatus('anonymous')
  }, [])

  return (
    <AuthContext.Provider value={{ status, me, login, register, logout, refetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

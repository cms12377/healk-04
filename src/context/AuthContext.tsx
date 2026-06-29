import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  login as apiLogin,
  logoutAuth,
  register as apiRegister,
  updateUserProfile,
} from '@/services/api'
import { fetchUserFromSession, isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoggedIn: boolean
  isReady: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (patch: Partial<Pick<User, 'nickname' | 'avatar'>>) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) {
        fetchUserFromSession(session)
          .then(setUser)
          .catch(() => setUser(null))
          .finally(() => setIsReady(true))
      } else {
        setIsReady(true)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session) {
        fetchUserFromSession(session).then(setUser).catch(() => setUser(null))
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const loggedIn = await apiLogin(username, password)
    setUser(loggedIn)
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    const registered = await apiRegister(username, password)
    setUser(registered)
  }, [])

  const logout = useCallback(async () => {
    await logoutAuth()
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (patch: Partial<Pick<User, 'nickname' | 'avatar'>>) => {
    await updateUserProfile(patch)
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const refreshUser = useCallback(async () => {
    if (!isSupabaseConfigured) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      setUser(null)
      return
    }
    const profile = await fetchUserFromSession(session)
    setUser(profile)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!user?.token,
      isReady,
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
    }),
    [user, isReady, login, register, logout, updateProfile, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

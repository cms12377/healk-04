import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { shouldUseAdminApp } from '@/admin/adminRouting'
import { AdminApp } from '@/admin/AdminApp'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { isStaffUser, markAdminLoginIntent } from '@/lib/authRedirect'
import { checkIsStaff } from '@/lib/supabase'
import './index.css'
import App from './App.tsx'

function RootRouter() {
  const { isLoggedIn, isReady, user } = useAuth()
  const [isStaff, setIsStaff] = useState<boolean | null>(null)
  const [useAdmin, setUseAdmin] = useState(() => {
    if (typeof window === 'undefined') return false
    return shouldUseAdminApp(window.location.hash, false)
  })

  useEffect(() => {
    if (!isLoggedIn) {
      setIsStaff(null)
      return
    }
    checkIsStaff()
      .then(setIsStaff)
      .catch(() => setIsStaff(false))
  }, [isLoggedIn])

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash
      const staff = isStaffUser(user) || isStaff === true
      setUseAdmin(shouldUseAdminApp(hash, staff))

      if (!isReady) return

      if (shouldUseAdminApp(hash, false) && !isLoggedIn) {
        markAdminLoginIntent()
        const path = hash.replace(/^#/, '').replace(/^\//, '').split('?')[0]
        if (path !== 'login' && path !== 'register') {
          window.location.hash = '#/login'
        }
      }
    }

    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [isLoggedIn, isReady, user, isStaff])

  if (useAdmin && isLoggedIn) {
    return <AdminApp />
  }

  return <App />
}

function Root() {
  return (
    <AuthProvider>
      <RootRouter />
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

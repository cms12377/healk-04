import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { parseAdminHash } from '@/admin/adminRouting'
import { AdminApp } from '@/admin/AdminApp'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { markAdminLoginIntent } from '@/lib/authRedirect'
import './index.css'
import App from './App.tsx'

function RootRouter() {
  const { isLoggedIn, isReady } = useAuth()
  const [adminRoute, setAdminRoute] = useState(() => parseAdminHash() !== null)

  useEffect(() => {
    const sync = () => {
      const onAdmin = parseAdminHash() !== null
      setAdminRoute(onAdmin)

      if (!isReady) return

      if (onAdmin && !isLoggedIn) {
        markAdminLoginIntent()
        const hash = window.location.hash.replace(/^#/, '').replace(/^\//, '')
        if (hash !== 'login' && hash !== 'register') {
          window.location.hash = '#/login'
        }
      }
    }

    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [isLoggedIn, isReady])

  if (adminRoute && isLoggedIn) {
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

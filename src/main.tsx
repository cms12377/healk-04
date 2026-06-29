import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/context/AuthContext'
import { AdminApp } from '@/admin/AdminApp'
import { parseAdminHash } from '@/admin/adminRouting'
import './index.css'
import App from './App.tsx'

function Root() {
  const [isAdmin, setIsAdmin] = useState(() => parseAdminHash() !== null)

  useEffect(() => {
    const sync = () => setIsAdmin(parseAdminHash() !== null)
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  return (
    <AuthProvider>{isAdmin ? <AdminApp /> : <App />}</AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

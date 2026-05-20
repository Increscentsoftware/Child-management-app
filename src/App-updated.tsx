import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { startSyncWatcher, getPendingCount, pullFromSupabase } from '@/lib/sync'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'

import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ChildrenListPage from '@/pages/ChildrenListPage'
import ChildProfilePage from '@/pages/ChildProfilePage'
import AddChildPage from '@/pages/AddChildPage'
import FollowupPage from '@/pages/FollowupPage'
import ChangeLogPage from '@/pages/ChangeLogPage'
import ImportPage from '@/pages/ImportPage'
import UserManagementPage from '@/pages/admin/UserManagementPage'
import Layout from '@/components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAppStore()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAppStore()
  const { canManageUsers } = usePermissions()
  if (!user) return <Navigate to="/login" replace />
  if (!canManageUsers) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { user, setUser, setIsOnline, setPendingSync } = useAppStore()

  useEffect(() => {
    // Auth state listener
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase
          .from('social_workers')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) setUser(data)
      }
    })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('social_workers')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) setUser(data)
      } else {
        setUser(null)
      }
    })

    // Online/offline tracking
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Sync watcher
    const stopSync = startSyncWatcher()

    // Pull fresh data on load
    if (navigator.onLine) {
      pullFromSupabase()
    }

    // Track pending sync count
    const interval = setInterval(async () => {
      const count = await getPendingCount()
      setPendingSync(count)
    }, 5000)

    return () => {
      stopSync()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontSize: 13, background: '#1a6b4a', color: '#fff' },
          success: { style: { background: '#1a6b4a' } },
          error: { style: { background: '#a32d2d' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/children" element={<ChildrenListPage />} />
          <Route path="/children/:id" element={<ChildProfilePage />} />
          <Route path="/children/add" element={<AddChildPage />} />
          <Route path="/children/:id/followup" element={<FollowupPage />} />
          <Route path="/changelog" element={<ChangeLogPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Route>
        {/* Admin Routes */}
        <Route path="/admin/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

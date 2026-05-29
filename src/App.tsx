import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { startSyncWatcher, pullFromSupabase } from '@/lib/sync'

import Layout from '@/components/Layout'

// Pages
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ChildrenListPage from '@/pages/ChildrenListPage'
import ChildProfilePage from '@/pages/ChildProfilePage-Enhanced'
import AddChildPage from '@/pages/AddChildPage'
import FollowupPage from '@/pages/FollowupPage'
import ChangeLogPage from '@/pages/ChangeLogPage'
import ImportPage from '@/pages/ImportPage'
import SeedDataPage from '@/pages/SeedDataPage'

// Admin Pages
import UserManagementPage from '@/pages/admin/UserManagementPage'

// Lazy Loaded Admin Page
const FormFieldManager = lazy(
  () => import('@/pages/admin/FormFieldManager')
)

function App() {
  useEffect(() => {
    const stopSync = startSyncWatcher()
    if (navigator.onLine) pullFromSupabase()
    return () => stopSync()
  }, [])

  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}

        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* MAIN APP */}

        <Route
          path="/"
          element={<Layout />}
        >

          {/* DASHBOARD */}

          <Route
            index
            element={<DashboardPage />}
          />

          {/* CHILDREN */}

          <Route
            path="children"
            element={<ChildrenListPage />}
          />

          <Route
            path="children/add"
            element={<AddChildPage />}
          />

          <Route
            path="children/:id"
            element={<ChildProfilePage />}
          />

          <Route
            path="children/:id/edit"
            element={<AddChildPage />}
          />

          <Route
            path="children/:id/followup"
            element={<FollowupPage />}
          />

          {/* CHANGE LOG */}

          <Route
            path="changelog"
            element={<ChangeLogPage />}
          />

          {/* IMPORT */}

          <Route
            path="import"
            element={<ImportPage />}
          />

          {/* SEED DATA (dev/testing) */}

          <Route
            path="seed"
            element={<SeedDataPage />}
          />

          {/* ADMIN */}

          <Route
            path="admin/users"
            element={<UserManagementPage />}
          />

          <Route
            path="admin/form-fields"
            element={
              <Suspense
                fallback={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '100vh',
                      fontFamily: 'DM Sans',
                    }}
                  >
                    Loading...
                  </div>
                }
              >
                <FormFieldManager />
              </Suspense>
            }
          />

        </Route>

        {/* FALLBACK */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App
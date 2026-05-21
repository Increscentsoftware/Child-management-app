import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

import Layout from '@/components/Layout'

// Existing imports
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ChildrenListPage from '@/pages/ChildrenListPage'
import AddChildPage from '@/pages/AddChildPage'
import UserManagementPage from '@/pages/admin/UserManagementPage'
// ... other imports

// Lazy load FormFieldManager
const FormFieldManager = lazy(() => import('@/pages/admin/FormFieldManager'))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="children" element={<ChildrenListPage />} />
          <Route path="children/add" element={<AddChildPage />} />
          <Route path="admin/users" element={<UserManagementPage />} />
          <Route
            path="admin/form-fields"
            element={(
              <Suspense fallback={(
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '100vh'
                }}>
                  Loading...
                </div>
              )}>
                <FormFieldManager />
              </Suspense>
            )}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
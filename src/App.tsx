import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

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
        <Route path="/" element={<DashboardPage />} />
        <Route path="/children" element={<ChildrenListPage />} />
        <Route path="/children/add" element={<AddChildPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        
        {/* Add this route */}
        <Route 
          path="/admin/form-fields" 
          element={
            <Suspense fallback={
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '100vh' 
              }}>
                Loading...
              </div>
            }>
              <FormFieldManager />
            </Suspense>
          } 
        />
        
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
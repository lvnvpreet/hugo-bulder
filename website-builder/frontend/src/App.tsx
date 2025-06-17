import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { WizardPage as NewWizardPage } from '@/pages/WizardPageNew'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import DiagnosticsPage from '@/pages/DiagnosticsPage'
import { useTheme } from '@/hooks'
import { useAuthInit } from '@/hooks/useAuthInit'
import { useEffect } from 'react'

function App() {
  const { theme } = useTheme()
  
  // Initialize authentication state
  useAuthInit()

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System theme
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [theme])

  return (
    <>      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
          {/* Protected routes with layout */}
        <Route 
          path="/projects" 
          element={
            <ProtectedRoute>
              <Layout>
                <ProjectsPage />
              </Layout>
            </ProtectedRoute>
          } 
        />        <Route 
          path="/wizard/*" 
          element={
            <ProtectedRoute>
              <Layout>
                <NewWizardPage />
              </Layout>
            </ProtectedRoute>
          } 
        />        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Development/Debug routes */}
        <Route 
          path="/diagnostics" 
          element={
            <ProtectedRoute>
              <Layout>
                <DiagnosticsPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Catch all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      
      {/* Global toast notifications */}
      <Toaster 
        position="top-right"
        theme={theme === 'system' ? 'system' : theme}
        richColors
      />
    </>
  )
}

export default App
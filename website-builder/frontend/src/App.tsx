import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { WizardPage } from '@/pages/WizardPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useTheme } from '@/hooks'
import { useEffect } from 'react'

function App() {
  const { theme } = useTheme()

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
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/register" element={<div>Register Page</div>} />
        
        {/* Protected routes with layout */}
        <Route 
          path="/projects" 
          element={
            <Layout>
              <ProjectsPage />
            </Layout>
          } 
        />
        <Route 
          path="/wizard/*" 
          element={
            <Layout>
              <WizardPage />
            </Layout>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <Layout>
              <SettingsPage />
            </Layout>
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
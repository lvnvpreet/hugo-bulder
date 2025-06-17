import { useEffect } from 'react'
import { useAuthStore } from '@/store'

export const useAuthInit = () => {
  const { user, token, login, logout } = useAuthStore()

  useEffect(() => {
    // Check if we have stored auth data
    const storedToken = localStorage.getItem('authToken')
    
    if (storedToken && !user) {
      // We have a token but no user data - this can happen after a page refresh
      // In a real app, you'd validate the token with the backend
      // For now, we'll create a basic user object from stored data
      
      try {
        // Try to restore user from localStorage as well (Zustand should handle this)
        // If not available, create a basic user
        const basicUser = {
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        console.log('🔐 Restoring auth session with token:', storedToken.substring(0, 10) + '...')
        login(basicUser, storedToken)
      } catch (error) {
        console.error('Failed to restore auth session:', error)
        logout()
      }
    } else if (!storedToken && user) {
      // No token but we have user data - clear everything
      logout()
    }
  }, [user, token, login, logout])

  return { user, token, isAuthenticated: !!user && !!token }
}

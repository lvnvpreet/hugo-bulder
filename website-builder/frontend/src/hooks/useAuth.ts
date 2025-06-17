import { useState, useEffect } from 'react'
import { authAPI } from '../services/api'

export interface User {
  id: string
  email: string
  name?: string
  plan: string
  projectsLimit: number
  projectsUsed: number
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isGuest: boolean
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('authToken'),
    isAuthenticated: false,
    isLoading: true,
    isGuest: false
  })

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }))

    try {
      const existingToken = localStorage.getItem('authToken')
      
      if (existingToken) {
        // Token exists, assume user is authenticated
        setAuthState(prev => ({
          ...prev,
          token: existingToken,
          isAuthenticated: true,
          isLoading: false,
          isGuest: existingToken.includes('guest') // Simple guest detection
        }))
      } else {
        // No token, user needs to authenticate
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false,
          isLoading: false
        }))
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false
      }))
    }
  }

  const loginAsGuest = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const result = await authAPI.createGuest()
      localStorage.setItem('authToken', result.token)
      
      setAuthState({
        user: result.user,
        token: result.token,
        isAuthenticated: true,
        isLoading: false,
        isGuest: true
      })
      
      return result
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const login = async (credentials: { email: string; password: string }) => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const result = await authAPI.login(credentials)
      localStorage.setItem('authToken', result.token)
      
      setAuthState({
        user: result.user,
        token: result.token,
        isAuthenticated: true,
        isLoading: false,
        isGuest: false
      })
      
      return result
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isGuest: false
    })
  }

  const autoAuthIfNeeded = async () => {
    if (!authState.isAuthenticated && !authState.isLoading) {
      return await loginAsGuest()
    }
    return authState
  }

  return {
    ...authState,
    login,
    loginAsGuest,
    logout,
    autoAuthIfNeeded,
    refresh: initializeAuth
  }
}

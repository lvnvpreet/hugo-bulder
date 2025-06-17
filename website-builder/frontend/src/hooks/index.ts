import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore, useProjectsStore, useUIStore, useGenerationStore } from '@/store'
import { authAPI, projectsAPI, aiAPI } from '@/services/api'
import { toast } from 'sonner'

// Export auth initialization hook
export { useAuthInit } from './useAuthInit'

// Authentication hooks
export const useAuth = () => {
  const auth = useAuthStore()
  
  const login = useCallback(async (email: string, password: string) => {
    auth.setLoading(true)
    try {
      const { user, token } = await authAPI.login({ email, password })
      auth.login(user, token)
      toast.success('Welcome back!')
      return { success: true }
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
      return { success: false, error: error.message }
    } finally {
      auth.setLoading(false)
    }
  }, [auth])
  
  const register = useCallback(async (name: string, email: string, password: string) => {
    auth.setLoading(true)
    try {
      const { user, token } = await authAPI.register({ name, email, password })
      auth.login(user, token)
      toast.success('Account created successfully!')
      return { success: true }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
      return { success: false, error: error.message }
    } finally {
      auth.setLoading(false)
    }
  }, [auth])
  
  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      // Ignore logout errors
    } finally {
      auth.logout()
      toast.success('Logged out successfully')
    }
  }, [auth])
  
  return {
    ...auth,
    login,
    register,
    logout,
  }
}

// Projects hooks
export const useProjects = () => {
  const projects = useProjectsStore()
  
  const fetchProjects = useCallback(async (params?: any) => {
    projects.setLoading(true)
    try {
      const response = await projectsAPI.getAll(params)
      projects.setProjects(response.data || [])
      projects.setPagination(response.pagination)
    } catch (error: any) {
      projects.setError(error.message)
      toast.error('Failed to load projects')
    } finally {
      projects.setLoading(false)
    }
  }, [projects])
  
  const createProject = useCallback(async (data: any) => {
    try {
      const project = await projectsAPI.create(data)
      projects.addProject(project as any)
      toast.success('Project created successfully!')
      return project
    } catch (error: any) {
      toast.error(error.message || 'Failed to create project')
      throw error
    }
  }, [projects])
  
  const updateProject = useCallback(async (id: string, data: any) => {
    try {
      const project = await projectsAPI.update(id, data)
      projects.updateProject(id, project as any)
      toast.success('Project updated successfully!')
      return project
    } catch (error: any) {
      toast.error(error.message || 'Failed to update project')
      throw error
    }
  }, [projects])
  
  const deleteProject = useCallback(async (id: string) => {
    try {
      await projectsAPI.delete(id)
      projects.deleteProject(id)
      toast.success('Project deleted successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete project')
      throw error
    }
  }, [projects])
  
  return {
    ...projects,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  }
}

// Generation hooks
export const useGeneration = () => {
  const generation = useGenerationStore()
  
  const startGeneration = useCallback(async (projectId: string, wizardData: any) => {
    try {
      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      generation.startGeneration(projectId, generationId)
        // Start the generation process
      await projectsAPI.generateContent(projectId, wizardData)
      
      // Poll for status updates
      const pollStatus = async () => {
        try {
          const status = await projectsAPI.getGenerationStatus(generationId) as any
          
          generation.updateGeneration(generationId, {
            status: status.status,
            progress: status.progress,
            currentStep: status.currentStep,
          })
          
          if (status.status === 'completed') {
            generation.completeGeneration(generationId, status.content)
            toast.success('Content generation completed!')
          } else if (status.status === 'failed') {
            generation.failGeneration(generationId, status.errors?.[0] || 'Generation failed')
            toast.error('Content generation failed')
          } else if (status.status === 'running') {
            // Continue polling
            setTimeout(pollStatus, 2000)
          }
        } catch (error: any) {
          generation.failGeneration(generationId, error.message)
          toast.error('Failed to check generation status')
        }
      }
      
      // Start polling
      setTimeout(pollStatus, 1000)
      
      return generationId
    } catch (error: any) {
      toast.error(error.message || 'Failed to start generation')
      throw error
    }
  }, [generation])
  
  return {
    ...generation,
    startGeneration,
  }
}

// API status hook
export const useApiStatus = () => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  
  const checkStatus = useCallback(async () => {
    setStatus('checking')
    try {
      // Simple ping to check if API is responsive
      await aiAPI.getModels()
      setStatus('online')
    } catch (error) {
      setStatus('offline')
    } finally {
      setLastCheck(new Date())
    }
  }, [])
  
  useEffect(() => {
    checkStatus()
    
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000)
    
    return () => clearInterval(interval)
  }, [checkStatus])
  
  return { status, lastCheck, checkStatus }
}

// Local storage hook
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })
  
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])
  
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])
  
  return [storedValue, setValue, removeValue] as const
}

// Debounced value hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

// Previous value hook
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>()
  
  useEffect(() => {
    ref.current = value
  })
  
  return ref.current
}

// Online status hook
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  return isOnline
}

// Copy to clipboard hook
export const useClipboard = () => {
  const [copied, setCopied] = useState(false)
  
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }, [])
  
  return { copied, copy }
}

// Theme hook
export const useTheme = () => {
  const { theme, setTheme } = useUIStore()
  
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }, [theme, setTheme])
  
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const resolvedTheme = theme === 'system' ? systemTheme : theme
  
  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  }
}

// Intersection Observer hook
export const useIntersectionObserver = (
  elementRef: React.RefObject<Element>,
  { threshold = 0, root = null, rootMargin = '0%' }: IntersectionObserverInit = {}
) => {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  
  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    
    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      { threshold, root, rootMargin }
    )
    
    observer.observe(element)
    
    return () => observer.disconnect()
  }, [elementRef, threshold, root, rootMargin])
  
  return entry
}

// Window size hook
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return windowSize
}

// Media query hook
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(window.matchMedia(query).matches)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches)
    
    mediaQuery.addEventListener('change', handler)
    
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])
  
  return matches
}

// Form validation hook
export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationSchema: any
) => {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isValid, setIsValid] = useState(false)
  
  const validateField = useCallback((name: string, value: any) => {
    try {
      validationSchema.shape[name].parse(value)
      setErrors(prev => ({ ...prev, [name]: '' }))
      return true
    } catch (error: any) {
      const message = error.errors?.[0]?.message || 'Invalid value'
      setErrors(prev => ({ ...prev, [name]: message }))
      return false
    }
  }, [validationSchema])
  
  const validateForm = useCallback(() => {
    try {
      validationSchema.parse(values)
      setErrors({})
      setIsValid(true)
      return true
    } catch (error: any) {
      const formErrors: Record<string, string> = {}
      error.errors?.forEach((err: any) => {
        const path = err.path.join('.')
        formErrors[path] = err.message
      })
      setErrors(formErrors)
      setIsValid(false)
      return false
    }
  }, [values, validationSchema])
  
  const setValue = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    setTouched(prev => ({ ...prev, [name]: true }))
    
    // Validate field after setting value
    setTimeout(() => validateField(name, value), 0)
  }, [validateField])
  
  const setFieldTouched = useCallback((name: string, touched = true) => {
    setTouched(prev => ({ ...prev, [name]: touched }))
  }, [])
  
  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsValid(false)
  }, [initialValues])
  
  useEffect(() => {
    validateForm()
  }, [validateForm])
  
  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setFieldTouched,
    validateField,
    validateForm,
    reset,
  }
}

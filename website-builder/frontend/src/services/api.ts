import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

// API Configuration with environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const AI_ENGINE_URL = import.meta.env.VITE_AI_ENGINE_URL || 'http://localhost:3002'
const HUGO_GENERATOR_URL = import.meta.env.VITE_HUGO_GENERATOR_URL || 'http://localhost:3003'
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '1200000') // 20 minutes timeout (increased from 30 seconds)
const RETRY_ATTEMPTS = parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3')
const RETRY_DELAY = parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000')
const HEALTH_CHECK_INTERVAL = parseInt(import.meta.env.VITE_HEALTH_CHECK_INTERVAL || '30000')

// Development logging flag - always enable for debugging
const ENABLE_LOGGING = true // Force enable logging to debug issues

console.log('🔧 API Configuration:', {
  API_BASE_URL,
  BACKEND_URL,
  AI_ENGINE_URL,
  HUGO_GENERATOR_URL,
  API_TIMEOUT,
  RETRY_ATTEMPTS,
  ENABLE_LOGGING,
  NODE_ENV: import.meta.env.MODE,
  VITE_ENABLE_API_LOGGING: import.meta.env.VITE_ENABLE_API_LOGGING
})

// Enhanced Service Health Status
export interface ServiceStatus {
  backend: boolean
  aiEngine: boolean
  hugoGenerator: boolean
  lastChecked: Date
  errors: Record<string, string>
  responseTimeMs: Record<string, number>
}

// Global service status with detailed tracking
let serviceStatus: ServiceStatus = {
  backend: false,
  aiEngine: false,
  hugoGenerator: false,
  lastChecked: new Date(),
  errors: {},
  responseTimeMs: {}
}

// Service status change callbacks
const statusChangeCallbacks: Array<(status: ServiceStatus) => void> = []

export const onServiceStatusChange = (callback: (status: ServiceStatus) => void) => {
  statusChangeCallbacks.push(callback)
  return () => {
    const index = statusChangeCallbacks.indexOf(callback)
    if (index > -1) statusChangeCallbacks.splice(index, 1)
  }
}

const notifyStatusChange = () => {
  statusChangeCallbacks.forEach(callback => {
    try {
      callback(serviceStatus)
    } catch (error) {
      console.error('Error in status change callback:', error)
    }
  })
}

// Create axios instance with enhanced configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
  validateStatus: (status) => {
    // Consider 2xx as successful, retry on 5xx
    return (status >= 200 && status < 300) || status >= 500
  }
})

// Connection test utility
export const testConnection = async (): Promise<{
  backend: boolean;
  responseTime: number;
  error?: string;
}> => {
  const startTime = Date.now()
  
  try {
    // Use the API client which already has the correct baseURL (/api)
    const response = await apiClient.get('/status', { 
      timeout: 5000
    })
    const responseTime = Date.now() - startTime
    
    return {
      backend: response.status === 200,
      responseTime
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      backend: false,
      responseTime,
      error: error.response?.status === 404
        ? 'Backend /api/status endpoint not found'
        : error.code === 'ECONNREFUSED' 
        ? 'Backend server is not running on port 3001'
        : error.code === 'ENOTFOUND'
        ? 'Cannot resolve localhost - check your network'
        : error.message
    }
  }
}

// Retry utility function
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> => {
  try {
    return await requestFn()
  } catch (error) {
    if (attempts <= 1) {
      throw error
    }

    const axiosError = error as AxiosError
    
    // Only retry on network errors or 5xx server errors
    if (
      !axiosError.response || 
      axiosError.response.status >= 500 ||
      axiosError.code === 'ECONNABORTED' ||
      axiosError.code === 'ENOTFOUND' ||
      axiosError.code === 'ECONNREFUSED'
    ) {
      console.log(`Retrying request... ${RETRY_ATTEMPTS - attempts + 1}/${RETRY_ATTEMPTS}`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return retryRequest(requestFn, attempts - 1, delay * 1.5) // Exponential backoff
    }
    
    throw error
  }
}

// Enhanced service health check with response time tracking
const checkServiceHealth = async (
  serviceName: string,
  url: string, 
  endpoint: string = '/health'
): Promise<{ isHealthy: boolean; responseTime: number; error?: string }> => {
  const startTime = Date.now()
  
  try {
    // Special handling for AI Engine which has a different health endpoint
    let healthUrl = `${url}${endpoint}`
    if (serviceName === 'AI Engine') {
      healthUrl = `${url}/api/v1/health/`
    }
    
    const response = await axios.get(healthUrl, { 
      timeout: 50000,
      validateStatus: (status) => status < 500 // Accept 4xx as "reachable"
    })
    
    const responseTime = Date.now() - startTime
    const isHealthy = response.status >= 200 && response.status < 300
    
    if (ENABLE_LOGGING) {
      console.log(`🏥 ${serviceName} health check: ${isHealthy ? '✅' : '⚠️'} (${responseTime}ms)`)
    }
    
    return { isHealthy, responseTime }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    const errorMessage = error.code === 'ECONNREFUSED' 
      ? 'Service not running'
      : error.code === 'ENOTFOUND'
      ? 'Service not found'
      : error.message    
    if (ENABLE_LOGGING) {
      console.warn(`🏥 ${serviceName} health check failed: ${errorMessage} (${responseTime}ms)`)
    }
    
    return { isHealthy: false, responseTime, error: errorMessage }
  }
}

// Update service status with detailed tracking
const updateServiceStatus = async (): Promise<ServiceStatus> => {
  const checks = await Promise.allSettled([
    checkServiceHealth('Backend', BACKEND_URL),
    checkServiceHealth('AI Engine', AI_ENGINE_URL),
    checkServiceHealth('Hugo Generator', HUGO_GENERATOR_URL)
  ])

  const [backendResult, aiEngineResult, hugoGeneratorResult] = checks

  const prevStatus = { ...serviceStatus }

  serviceStatus = {
    backend: backendResult.status === 'fulfilled' && backendResult.value.isHealthy,
    aiEngine: aiEngineResult.status === 'fulfilled' && aiEngineResult.value.isHealthy,
    hugoGenerator: hugoGeneratorResult.status === 'fulfilled' && hugoGeneratorResult.value.isHealthy,
    lastChecked: new Date(),
    errors: {
      backend: backendResult.status === 'fulfilled' && backendResult.value.error ? backendResult.value.error : '',
      aiEngine: aiEngineResult.status === 'fulfilled' && aiEngineResult.value.error ? aiEngineResult.value.error : '',
      hugoGenerator: hugoGeneratorResult.status === 'fulfilled' && hugoGeneratorResult.value.error ? hugoGeneratorResult.value.error : ''
    },
    responseTimeMs: {
      backend: backendResult.status === 'fulfilled' ? backendResult.value.responseTime : 0,
      aiEngine: aiEngineResult.status === 'fulfilled' ? aiEngineResult.value.responseTime : 0,
      hugoGenerator: hugoGeneratorResult.status === 'fulfilled' ? hugoGeneratorResult.value.responseTime : 0
    }
  }

  // Notify if status changed
  const statusChanged = 
    prevStatus.backend !== serviceStatus.backend ||
    prevStatus.aiEngine !== serviceStatus.aiEngine ||
    prevStatus.hugoGenerator !== serviceStatus.hugoGenerator

  if (statusChanged) {
    notifyStatusChange()
    
    if (ENABLE_LOGGING) {
      console.log('📊 Service status updated:', serviceStatus)
    }
  }

  return serviceStatus
}

// Fallback service selector
const getAvailableService = (primaryUrl: string, fallbackUrls: string[] = []): string => {
  // In a real implementation, you might check service status here
  // For now, return primary URL but log service status
  if (!serviceStatus.backend && primaryUrl.includes('3001')) {
    console.warn('Backend service appears to be down, using primary URL anyway')
  }
  return primaryUrl
}

// Enhanced request interceptor with better debugging
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add request ID for tracing
    const requestId = generateRequestId()
    config.headers['X-Request-ID'] = requestId
    
    // Add request debugging in development
    if (ENABLE_LOGGING) {
      console.log(`🚀 [${requestId}] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
      if (config.data) {
        console.log(`📤 [${requestId}] Request data:`, config.data)
      }
    }
    
    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Enhanced response interceptor with comprehensive error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const requestId = response.config.headers?.['X-Request-ID'] as string
    
    // Log successful responses in development
    if (ENABLE_LOGGING) {
      console.log(`✅ [${requestId}] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${response.config.timeout}ms timeout)`)
      if (response.data) {
        console.log(`📥 [${requestId}] Response data:`, response.data)
      }
    }
    
    return response
  },
  async (error: AxiosError) => {
    const requestId = error.config?.headers?.['X-Request-ID'] as string
    const method = error.config?.method?.toUpperCase()
    const url = error.config?.url
    
    console.error(`❌ [${requestId}] ${method} ${url} failed:`, error)

    // Handle network and connection errors first
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        console.error('⏱️ Request timeout - server took too long to respond')
        toast.error(`Request timeout. The server is taking too long to respond.`)
      } else if (error.code === 'ECONNREFUSED') {
        console.error('🔌 Connection refused - backend server is not running')
        toast.error('Cannot connect to backend server. Is it running on port 3001?')
        serviceStatus.backend = false
        notifyStatusChange()
      } else if (error.code === 'ENOTFOUND') {
        console.error('🔍 Host not found - network/DNS issue')
        toast.error('Network error. Please check your connection.')
      } else {
        console.error('🌐 Network error:', error.message)
        toast.error('Network error. Please check if the server is running.')
      }
      
      // Try to update service status
      updateServiceStatus()
      return Promise.reject(error)
    }

    // Handle HTTP errors with detailed feedback
    const status = error.response.status
    const data = error.response.data as any
      switch (status) {      case 401:
        console.error('🔐 Authentication required')
        toast.error('Authentication required. Please log in again.')
        localStorage.removeItem('authToken')
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
          window.location.href = `/login?returnUrl=${returnUrl}`
        }
        break
        
      case 403:
        console.error('🚫 Access forbidden')
        toast.error('Access forbidden. Please ensure you are logged in with proper permissions.')
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
          window.location.href = `/login?returnUrl=${returnUrl}`
        }
        break
        
      case 404:
        console.error('🔍 Resource not found')
        toast.error('The requested resource was not found')
        break
        
      case 422:
        console.error('📝 Validation error:', data?.error?.details || data?.errors)
        if (data?.error?.details) {
          toast.error(`Validation error: ${data.error.details}`)
        } else if (data?.errors) {
          const errorMessages = Object.values(data.errors).flat().join(', ')
          toast.error(`Validation error: ${errorMessages}`)
        } else {
          toast.error('Invalid data provided')
        }
        break
        
      case 429:
        console.error('🚦 Rate limit exceeded')
        toast.error('Too many requests. Please wait a moment and try again.')
        break
        
      case 500:
        console.error('💥 Server error')
        toast.error('Server error. Our team has been notified.')
        break
        
      case 502:
        console.error('🔗 Bad gateway - service unavailable')
        toast.error('Service temporarily unavailable. Please try again.')
        break
        
      case 503:
        console.error('⚠️ Service unavailable')
        toast.error('Service temporarily unavailable. Please try again later.')
        break
        
      default:
        console.error(`❓ Unexpected error (${status}):`, data)
        toast.error(`Unexpected error occurred (${status})`)
    }
    
    return Promise.reject(error)
  }
)

// Utility function to generate request IDs
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Generic API methods
class ApiService {
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const response = await apiClient.get<ApiResponse<T>>(endpoint, { params })
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'API request failed')
    }
    
    return response.data.data!
  }
  
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await apiClient.post<ApiResponse<T>>(endpoint, data)
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'API request failed')
    }
    
    return response.data.data!
  }
  
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await apiClient.put<ApiResponse<T>>(endpoint, data)
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'API request failed')
    }
    
    return response.data.data!
  }
  
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await apiClient.patch<ApiResponse<T>>(endpoint, data)
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'API request failed')
    }
    
    return response.data.data!
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    const response = await apiClient.delete<ApiResponse<T>>(endpoint)
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'API request failed')
    }
    
    return response.data.data!
  }
  
  async upload<T>(endpoint: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post<ApiResponse<T>>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Upload failed')
    }
    
    return response.data.data!
  }
}

// Create service instance
export const api = new ApiService()

// Specific API endpoints
export const authAPI = {
  // Login user
  login: (credentials: { email: string; password: string }): Promise<{ user: any; token: string; refreshToken: string }> =>
    retryRequest(() => 
      apiClient.post('/auth/login', credentials).then(response => response.data.data)
    ),
  // Register user
  register: (userData: { name: string; email: string; password: string }): Promise<{ user: any; token: string; verificationRequired: boolean }> =>
    retryRequest(() => 
      apiClient.post('/auth/register', userData).then(response => response.data.data)
    ),
}

// ADD THIS THEME API HELPER
export const themeAPI = {
  // For existing projects (current working method)
  getProjectTheme: (projectId: string) =>
    api.get(`/generations/detect-theme/${projectId}`),
  
  // For wizard data without saving project (replaces AI endpoint)
  getWizardTheme: (wizardData: any) =>
    api.post('/generations/detect-theme-wizard', { wizardData }),
  
  // Smart detection method
  detectTheme: (projectId?: string, wizardData?: any) => {
    if (projectId) {
      return themeAPI.getProjectTheme(projectId);
    } else if (wizardData) {
      return themeAPI.getWizardTheme(wizardData);
    } else {
      throw new Error('Either projectId or wizardData is required');
    }
  }
};

export const projectsAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<any>>('/projects', params),
  
  getById: (id: string) => api.get(`/projects/${id}`),
  
  create: (data: any) => api.post('/projects', data),
  
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  
  delete: (id: string) => api.delete(`/projects/${id}`),
  
  duplicate: (id: string) => api.post(`/projects/${id}/duplicate`),
    generateContent: (id: string, generationData: any) =>
    api.post(`/generations/${id}/start`, generationData),
  
  getGenerationStatus: (generationId: string) =>
    api.get(`/generations/${generationId}/status`),
  
  export: (id: string, format: 'zip' | 'hugo') =>
    api.get(`/projects/${id}/export?format=${format}`),
  
  publish: (id: string, settings: any) =>
    api.post(`/projects/${id}/publish`, settings),
}

export const aiAPI = {
  generateContent: (prompt: string, context?: any) =>
    api.post('/ai/generate', { prompt, context }),
  
  improveContent: (content: string, instructions: string) =>
    api.post('/ai/improve', { content, instructions }),
  
  generateSEO: (content: string, keywords: string[]) =>
    api.post('/ai/seo', { content, keywords }),
  
  generateImages: (prompt: string, count: number = 1) =>
    api.post('/ai/images', { prompt, count }),
  
  generateLogo: (businessName: string, style: string) =>
    api.post('/ai/logo', { businessName, style }),
  
  analyzeSite: (url: string) =>
    api.post('/ai/analyze', { url }),
  
  getModels: () => api.get('/ai/models'),
  
  getModelStatus: (model: string) => api.get(`/ai/models/${model}/status`),
}

export const templatesAPI = {
  getAll: (category?: string) =>
    api.get('/templates', category ? { category } : undefined),
  
  getById: (id: string) => api.get(`/templates/${id}`),
  
  getPreview: (id: string) => api.get(`/templates/${id}/preview`),
  
  getCategories: () => api.get('/templates/categories'),
  
  search: (query: string, filters?: any) =>
    api.post('/templates/search', { query, ...filters }),
}

export const filesAPI = {
  upload: (file: File, onProgress?: (progress: number) => void) =>
    api.upload('/files/upload', file, onProgress),
  
  getAll: (projectId?: string) =>
    api.get('/files', projectId ? { projectId } : undefined),
  
  delete: (id: string) => api.delete(`/files/${id}`),
  
  getUploadUrl: (filename: string, contentType: string) =>
    api.post<{ uploadUrl: string; fileUrl: string }>('/files/upload-url', {
      filename,
      contentType,
    }),
}

export const settingsAPI = {
  get: () => api.get('/settings'),
  
  update: (settings: any) => api.patch('/settings', settings),
  
  getApiKeys: () => api.get('/settings/api-keys'),
  
  updateApiKeys: (keys: any) => api.patch('/settings/api-keys', keys),
  
  getBilling: () => api.get('/settings/billing'),
  
  updateBilling: (data: any) => api.patch('/settings/billing', data),
  
  getUsage: () => api.get('/settings/usage'),
}

// Utility functions for common API patterns
export const apiUtils = {
  // Handle API errors consistently
  handleError: (error: any, customMessage?: string) => {
    const message = error.response?.data?.error || error.message || customMessage || 'An error occurred'
    toast.error(message)
    console.error('API Error:', error)
  },
  
  // Create a loading wrapper for API calls
  withLoading: async <T>(
    apiCall: () => Promise<T>,
    loadingMessage?: string
  ): Promise<T> => {
    if (loadingMessage) {
      toast.loading(loadingMessage)
    }
    
    try {
      const result = await apiCall()
      toast.dismiss()
      return result
    } catch (error) {
      toast.dismiss()
      throw error
    }
  },
  
  // Retry API calls with exponential backoff
  retry: async <T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: any
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await apiCall()
      } catch (error) {
        lastError = error
        
        if (i === maxRetries) break
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
    
    throw lastError
  },
  
  // Batch API requests
  batch: async <T>(requests: (() => Promise<T>)[]): Promise<T[]> => {
    return Promise.all(requests.map(request => request()))
  },
  
  // Poll for status changes
  poll: async <T>(
    statusCheck: () => Promise<T>,
    isComplete: (result: T) => boolean,
    interval: number = 1000,
    maxAttempts: number = 60
  ): Promise<T> => {
    let attempts = 0
    
    return new Promise((resolve, reject) => {
      const check = async () => {
        try {
          const result = await statusCheck()
          
          if (isComplete(result)) {
            resolve(result)
          } else if (attempts >= maxAttempts) {
            reject(new Error('Polling timeout'))
          } else {
            attempts++
            setTimeout(check, interval)
          }
        } catch (error) {
          reject(error)
        }
      }
      
      check()
    })
  },
}

// Export service status and management functions
export const getServiceStatus = (): ServiceStatus => serviceStatus

export const refreshServiceStatus = async (): Promise<ServiceStatus> => {
  return await updateServiceStatus()
}

// Initialize service monitoring
let statusCheckInterval: NodeJS.Timeout | null = null

export const startServiceMonitoring = () => {
  if (statusCheckInterval) return
  
  // Initial check
  updateServiceStatus()
  
  // Periodic checks
  statusCheckInterval = setInterval(() => {
    updateServiceStatus()
  }, HEALTH_CHECK_INTERVAL)
  
  if (ENABLE_LOGGING) {
    console.log(`🔄 Service monitoring started (${HEALTH_CHECK_INTERVAL}ms interval)`)
  }
}

export const stopServiceMonitoring = () => {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
    statusCheckInterval = null
    
    if (ENABLE_LOGGING) {
      console.log('⏹️ Service monitoring stopped')
    }
  }
}

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined' && (import.meta as any).env?.VITE_ENABLE_SERVICE_MONITORING === 'true') {
  startServiceMonitoring()
}

// Export the configured axios instance for custom requests
export { apiClient }
export default api

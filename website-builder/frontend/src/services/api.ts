import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { toast } from 'sonner'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const API_TIMEOUT = 30000 // 30 seconds

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add request timestamp
    config.metadata = { startTime: new Date() }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time in development
    if (import.meta.env.DEV && response.config.metadata) {
      const duration = new Date().getTime() - response.config.metadata.startTime.getTime()
      console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`)
    }
    
    return response
  },
  (error: AxiosError) => {
    // Handle common error scenarios
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      // Forbidden
      toast.error('You do not have permission to perform this action')
    } else if (error.response?.status === 404) {
      // Not found
      toast.error('Resource not found')
    } else if (error.response?.status >= 500) {
      // Server error
      toast.error('Server error. Please try again later.')
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      toast.error('Request timeout. Please try again.')
    } else if (!error.response) {
      // Network error
      toast.error('Network error. Please check your connection.')
    }
    
    return Promise.reject(error)
  }
)

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
  login: (credentials: { email: string; password: string }) =>
    api.post<{ user: any; token: string }>('/auth/login', credentials),
  
  register: (userData: { name: string; email: string; password: string }) =>
    api.post<{ user: any; token: string }>('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  refreshToken: () => api.post<{ token: string }>('/auth/refresh'),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  
  verifyEmail: (token: string) =>
    api.post('/auth/verify-email', { token }),
  
  getProfile: () => api.get('/auth/profile'),
  
  updateProfile: (data: any) => api.patch('/auth/profile', data),
}

export const projectsAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<any>>('/projects', params),
  
  getById: (id: string) => api.get(`/projects/${id}`),
  
  create: (data: any) => api.post('/projects', data),
  
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  
  delete: (id: string) => api.delete(`/projects/${id}`),
  
  duplicate: (id: string) => api.post(`/projects/${id}/duplicate`),
  
  generateContent: (id: string, wizardData: any) =>
    api.post(`/projects/${id}/generate`, { wizardData }),
  
  getGenerationStatus: (id: string, generationId: string) =>
    api.get(`/projects/${id}/generation/${generationId}/status`),
  
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

// Export the configured axios instance for custom requests
export { apiClient }
export default api

import React, { useState, useEffect } from 'react'
import { 
  getServiceStatus, 
  refreshServiceStatus, 
  onServiceStatusChange, 
  testConnection,
  type ServiceStatus 
} from '@/services/api'

interface ServiceHealthDashboardProps {
  className?: string
  showDetails?: boolean
}

export const ServiceHealthDashboard: React.FC<ServiceHealthDashboardProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const [status, setStatus] = useState<ServiceStatus>(getServiceStatus())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = onServiceStatusChange((newStatus) => {
      setStatus(newStatus)
      setLastRefresh(new Date())
    })

    // Initial status update
    handleRefresh()

    return unsubscribe
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const newStatus = await refreshServiceStatus()
      setStatus(newStatus)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to refresh service status:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      const result = await testConnection()
      console.log('Connection test result:', result)
      
      if (result.backend) {
        alert(`✅ Backend connection successful! Response time: ${result.responseTime}ms`)
      } else {
        alert(`❌ Backend connection failed: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Connection test failed: ${error}`)
    }
  }

  const getStatusIcon = (isOnline: boolean) => 
    isOnline ? '🟢' : '🔴'

  const getStatusText = (isOnline: boolean) => 
    isOnline ? 'Online' : 'Offline'

  const getStatusColor = (isOnline: boolean) => 
    isOnline ? 'text-green-600' : 'text-red-600'

  const formatResponseTime = (ms: number) => 
    ms > 0 ? `${ms}ms` : 'N/A'

  const formatLastChecked = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Service Health
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleTestConnection}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Test Connection
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? '🔄' : '↻'} Refresh
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Backend Service */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center gap-3">
            <span className="text-xl">{getStatusIcon(status.backend)}</span>
            <div>
              <span className="font-medium">Backend API</span>
              <span className="text-sm text-gray-500 ml-2">
                (http://localhost:3001)
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-medium ${getStatusColor(status.backend)}`}>
              {getStatusText(status.backend)}
            </div>
            {showDetails && status.responseTimeMs.backend > 0 && (
              <div className="text-sm text-gray-500">
                {formatResponseTime(status.responseTimeMs.backend)}
              </div>
            )}
            {status.errors.backend && (
              <div className="text-sm text-red-500">
                {status.errors.backend}
              </div>
            )}
          </div>
        </div>

        {/* AI Engine Service */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center gap-3">
            <span className="text-xl">{getStatusIcon(status.aiEngine)}</span>
            <div>
              <span className="font-medium">AI Engine</span>
              <span className="text-sm text-gray-500 ml-2">
                (http://localhost:3002)
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-medium ${getStatusColor(status.aiEngine)}`}>
              {getStatusText(status.aiEngine)}
            </div>
            {showDetails && status.responseTimeMs.aiEngine > 0 && (
              <div className="text-sm text-gray-500">
                {formatResponseTime(status.responseTimeMs.aiEngine)}
              </div>
            )}
            {status.errors.aiEngine && (
              <div className="text-sm text-red-500">
                {status.errors.aiEngine}
              </div>
            )}
          </div>
        </div>

        {/* Hugo Generator Service */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center gap-3">
            <span className="text-xl">{getStatusIcon(status.hugoGenerator)}</span>
            <div>
              <span className="font-medium">Hugo Generator</span>
              <span className="text-sm text-gray-500 ml-2">
                (http://localhost:3003)
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-medium ${getStatusColor(status.hugoGenerator)}`}>
              {getStatusText(status.hugoGenerator)}
            </div>
            {showDetails && status.responseTimeMs.hugoGenerator > 0 && (
              <div className="text-sm text-gray-500">
                {formatResponseTime(status.responseTimeMs.hugoGenerator)}
              </div>
            )}
            {status.errors.hugoGenerator && (
              <div className="text-sm text-red-500">
                {status.errors.hugoGenerator}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Last checked: {formatLastChecked(status.lastChecked)}
          </span>
          <span>
            {[status.backend, status.aiEngine, status.hugoGenerator].filter(Boolean).length}/3 services online
          </span>
        </div>
      </div>

      {/* Troubleshooting Tips */}
      {(!status.backend || !status.aiEngine || !status.hugoGenerator) && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-medium text-yellow-800 mb-2">
            🚨 Service Issues Detected
          </h4>
          <div className="text-sm text-yellow-700 space-y-1">
            {!status.backend && (
              <div>• Backend: Run <code className="bg-yellow-100 px-1 rounded">npm run dev</code> in backend folder</div>
            )}
            {!status.aiEngine && (
              <div>• AI Engine: Run <code className="bg-yellow-100 px-1 rounded">python main.py</code> in ai-engine folder</div>
            )}
            {!status.hugoGenerator && (
              <div>• Hugo Generator: Run <code className="bg-yellow-100 px-1 rounded">npm run dev</code> in hugo-generator folder</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceHealthDashboard

import React from 'react'
import ServiceHealthDashboard from '@/components/ServiceHealthDashboard'
import { testConnection, getServiceStatus } from '@/services/api'

export const DiagnosticsPage: React.FC = () => {
  const handleTestBackend = async () => {
    try {
      const result = await testConnection()
      console.log('Backend test result:', result)
    } catch (error) {
      console.error('Backend test failed:', error)
    }
  }

  const handleLogStatus = () => {
    const status = getServiceStatus()
    console.log('Current service status:', status)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          System Diagnostics
        </h1>
        <p className="text-gray-600">
          Monitor service health and test connectivity between frontend and backend services.
        </p>
      </div>

      {/* Service Health Dashboard */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Service Health Monitor
        </h2>
        <ServiceHealthDashboard showDetails={true} />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleTestBackend}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="text-blue-700 font-medium">Test Backend Connection</div>
            <div className="text-blue-600 text-sm mt-1">
              Test direct connection to backend API
            </div>
          </button>

          <button
            onClick={handleLogStatus}
            className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="text-green-700 font-medium">Log Service Status</div>
            <div className="text-green-600 text-sm mt-1">
              Print current status to console
            </div>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <div className="text-orange-700 font-medium">Refresh Page</div>
            <div className="text-orange-600 text-sm mt-1">
              Reload app and reinitialize services
            </div>
          </button>
        </div>
      </div>

      {/* Environment Information */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Environment Configuration
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>API URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}
            </div>
            <div>
              <strong>Backend URL:</strong> {import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}
            </div>
            <div>
              <strong>AI Engine URL:</strong> {import.meta.env.VITE_AI_ENGINE_URL || 'http://localhost:3002'}
            </div>
            <div>
              <strong>Hugo Generator URL:</strong> {import.meta.env.VITE_HUGO_GENERATOR_URL || 'http://localhost:3003'}
            </div>
            <div>
              <strong>Environment:</strong> {import.meta.env.MODE}
            </div>
            <div>
              <strong>Development:</strong> {import.meta.env.DEV ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>API Timeout:</strong> {import.meta.env.VITE_API_TIMEOUT || '30000'}ms
            </div>
            <div>
              <strong>Service Monitoring:</strong> {import.meta.env.VITE_ENABLE_SERVICE_MONITORING || 'false'}
            </div>
          </div>
        </div>
      </div>

      {/* Network Information */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Network Information
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Current URL:</strong> {window.location.href}
            </div>
            <div>
              <strong>Protocol:</strong> {window.location.protocol}
            </div>
            <div>
              <strong>Host:</strong> {window.location.host}
            </div>
            <div>
              <strong>User Agent:</strong> {navigator.userAgent.split(' ')[0]}
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting Guide */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Troubleshooting Guide
        </h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">
            If services are showing as offline:
          </h3>
          <ol className="list-decimal list-inside text-yellow-700 space-y-1 text-sm">
            <li>Check that all services are running on their respective ports</li>
            <li>Verify .env files exist and contain correct URLs</li>
            <li>Check for port conflicts (another service using the same port)</li>
            <li>Ensure firewall/antivirus isn't blocking the ports</li>
            <li>Try restarting the services in this order: Backend → AI Engine → Hugo Generator → Frontend</li>
            <li>Run the network diagnostics script: <code className="bg-yellow-100 px-1 rounded">./scripts/network-diagnostics.ps1</code></li>
          </ol>
        </div>
      </div>

      {/* Console Output */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Console Output
        </h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          <div>Open browser DevTools (F12) to see detailed logs</div>
          <div>Network requests and service status changes are logged here</div>
        </div>
      </div>
    </div>
  )
}

export default DiagnosticsPage

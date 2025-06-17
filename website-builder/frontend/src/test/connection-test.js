// Connection Test Utility for Frontend
// Run with: npm run test:connection

import axios from 'axios'

const BACKEND_URL = process.env.VITE_API_URL || 'http://localhost:3001/api'
const BACKEND_BASE = process.env.VITE_BACKEND_URL || 'http://localhost:3001'
const AI_ENGINE_URL = process.env.VITE_AI_ENGINE_URL || 'http://localhost:3002'
const HUGO_GENERATOR_URL = process.env.VITE_HUGO_GENERATOR_URL || 'http://localhost:3003'

console.log('🔧 Frontend Connection Test')
console.log('============================')
console.log('Environment:', process.env.NODE_ENV || 'development')
console.log('Backend URL:', BACKEND_URL)
console.log('Backend Base:', BACKEND_BASE)
console.log('AI Engine URL:', AI_ENGINE_URL)
console.log('Hugo Generator URL:', HUGO_GENERATOR_URL)

async function testConnection(url, name, timeout = 5000) {
  const startTime = Date.now()
  
  try {
    console.log(`\n🔍 Testing ${name}...`)
    
    const response = await axios.get(url, { 
      timeout,
      validateStatus: () => true // Accept any status code
    })
    
    const responseTime = Date.now() - startTime
    const status = response.status
    
    if (status >= 200 && status < 300) {
      console.log(`✅ ${name} is responding (${status}) - ${responseTime}ms`)
      return { success: true, status, responseTime, data: response.data }
    } else if (status >= 400 && status < 500) {
      console.log(`⚠️ ${name} is reachable but returned ${status} - ${responseTime}ms`)
      return { success: false, status, responseTime, error: 'Client error' }
    } else {
      console.log(`❌ ${name} returned server error ${status} - ${responseTime}ms`)
      return { success: false, status, responseTime, error: 'Server error' }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`❌ ${name} - Connection refused (service not running) - ${responseTime}ms`)
      return { success: false, error: 'Connection refused', responseTime }
    } else if (error.code === 'ENOTFOUND') {
      console.log(`❌ ${name} - Host not found - ${responseTime}ms`)
      return { success: false, error: 'Host not found', responseTime }
    } else if (error.code === 'ECONNABORTED') {
      console.log(`❌ ${name} - Request timeout (>${timeout}ms)`)
      return { success: false, error: 'Timeout', responseTime }
    } else {
      console.log(`❌ ${name} - ${error.message} - ${responseTime}ms`)
      return { success: false, error: error.message, responseTime }
    }
  }
}

async function testCORS() {
  console.log('\n🔗 Testing CORS...')
  
  try {
    const response = await axios.options(`${BACKEND_BASE}/api/status`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      },
      timeout: 5000
    })
    
    console.log('✅ CORS preflight successful')
    console.log('Access-Control-Allow-Origin:', response.headers['access-control-allow-origin'])
    console.log('Access-Control-Allow-Methods:', response.headers['access-control-allow-methods'])
    console.log('Access-Control-Allow-Headers:', response.headers['access-control-allow-headers'])
    
    return true
  } catch (error) {
    console.log('❌ CORS preflight failed:', error.message)
    return false
  }
}

async function runTests() {
  console.log('\n📋 Running connection tests...\n')
  
  const tests = [
    { url: `${BACKEND_BASE}/health`, name: 'Backend Health Check' },
    { url: `${BACKEND_BASE}/api/status`, name: 'Backend API Status' },
    { url: `${AI_ENGINE_URL}/health`, name: 'AI Engine Health' },
    { url: `${HUGO_GENERATOR_URL}/health`, name: 'Hugo Generator Health' }
  ]
  
  const results = []
  
  for (const test of tests) {
    const result = await testConnection(test.url, test.name)
    results.push({ ...test, ...result })
  }
  
  // Test CORS
  const corsResult = await testCORS()
  
  // Summary
  console.log('\n📊 Test Summary:')
  console.log('================')
  
  const successfulTests = results.filter(r => r.success).length
  const totalTests = results.length
  
  console.log(`Connection Tests: ${successfulTests}/${totalTests} successful`)
  console.log(`CORS Test: ${corsResult ? 'PASSED' : 'FAILED'}`)
  
  if (successfulTests === totalTests && corsResult) {
    console.log('\n🎉 All tests passed! Your services are properly configured.')
  } else {
    console.log('\n🚨 Some tests failed. Check the following:')
    
    results.forEach(result => {
      if (!result.success) {
        console.log(`   • ${result.name}: ${result.error || 'Failed'}`)
      }
    })
    
    if (!corsResult) {
      console.log('   • CORS configuration needs to be fixed')
    }
    
    console.log('\n💡 Troubleshooting:')
    console.log('   1. Make sure all services are running')
    console.log('   2. Check environment variables in .env files')
    console.log('   3. Verify ports are not blocked by firewall')
    console.log('   4. Run network diagnostics script')
  }
  
  // Return exit code
  process.exit(successfulTests === totalTests && corsResult ? 0 : 1)
}

runTests().catch(error => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})

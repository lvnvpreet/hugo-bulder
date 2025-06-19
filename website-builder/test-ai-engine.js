const axios = require('axios');

async function testAIEngine() {
  try {
    console.log('🔍 Testing AI Engine health check...');
    const healthResponse = await axios.get('http://localhost:3002/api/v1/health', {
      timeout: 30000
    });
    console.log('✅ Health check passed:', healthResponse.status);
    
    console.log('🔍 Testing content generation...');
    const contentResponse = await axios.post('http://localhost:3002/api/v1/content/generate-content', {
      business_name: 'Test Business',
      business_type: 'Technology',
      industry: 'Software Development',
      description: 'A test business for content generation',
      target_audience: 'Developers',
      pages: ['home', 'about', 'services'],
      tone: 'professional',
      length: 'medium',
      include_seo: true
    }, {
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Content generation successful:', contentResponse.status);
    console.log('📊 Response data keys:', Object.keys(contentResponse.data));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAIEngine();

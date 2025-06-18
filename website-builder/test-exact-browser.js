const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Test with the exact project ID from browser logs
const testExactBrowserScenario = async () => {
  try {
    console.log('🔍 Testing exact browser scenario...');

    // First, let's try to use an existing user token or create one
    let token;
    try {
      // Try to login first
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'test@example.com',
        password: 'TestPass123!'
      });
      token = loginResponse.data.data.token;
      console.log('✅ Logged in with existing user');
    } catch (loginError) {
      // If login fails, create a new user
      console.log('Creating new user...');
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123!'
      });
      token = registerResponse.data.data.token;
      console.log('✅ Created new user');
    }

    // Now test the exact project ID from the browser
    const projectId = 'cmc1ivrfw0005mlujmrlhp4w8';
    console.log(`🎯 Testing generation request for project: ${projectId}`);

    // First check if project exists
    try {
      const projectResponse = await axios.get(`${API_BASE}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Project exists:', projectResponse.data);
    } catch (projectError) {
      console.log('❌ Project check failed:', {
        status: projectError.response?.status,
        data: projectError.response?.data
      });
    }

    // Try the generation request with exact browser data
    const generationRequest = {
      autoDetectTheme: true,
      customizations: {
        colors: {
          primary: '#2563eb',
          secondary: '#3b82f6'
        }
      },
      contentOptions: {
        tone: 'professional'
      }
    };

    console.log('🚀 Making generation request with browser data...');
    const generationResponse = await axios.post(
      `${API_BASE}/generations/${projectId}/start`,
      generationRequest,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('🎉 Generation request successful!');
    console.log('📥 Response:', generationResponse.data);

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('  Status:', error.response?.status);
    console.error('  Status Text:', error.response?.statusText);
    console.error('  Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('  Headers:', error.response?.headers);

    if (error.response?.status === 400) {
      console.log('🔍 Found the 400 error! This matches the browser issue.');
    }
  }
};

// Run the test
testExactBrowserScenario();

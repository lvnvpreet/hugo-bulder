const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

const test400Error = async () => {
  try {
    // Get auth token first
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'TestPass123!'
    });
    const token = loginResponse.data.data.token;

    // Use the project ID from your browser console error
    const projectId = 'cmc1ip4xd000b9kzqkoomplev';

    console.log('🧪 Testing 400 error with project:', projectId);
    console.log('🔑 Using token:', token.substring(0, 20) + '...');

    // Try to start generation - this should trigger the 400 error
    const response = await axios.post(
      `${API_BASE}/generations/${projectId}/start`,
      {
        hugoTheme: 'ananke',
        contentOptions: { tone: 'professional' }
      },
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    console.log('✅ Unexpected success:', response.data);

  } catch (error) {
    console.log('❌ Expected 400 error occurred:');
    console.log('  - Status:', error.response?.status);
    console.log('  - Status Text:', error.response?.statusText);
    console.log('  - Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('  - Config:', {
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data,
      headers: error.config?.headers
    });
  }
};

test400Error();

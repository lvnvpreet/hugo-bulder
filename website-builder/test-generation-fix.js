const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Function to get a valid auth token
const getAuthToken = async () => {
  try {
    // Try to login with test user
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'TestPass123!'
    });
    return loginResponse.data.data.token;
  } catch (error) {
    // If login fails, register a new user
    console.log('Creating new test user...');
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPass123!'
    });
    return registerResponse.data.data.token;
  }
};

const testGenerationFix = async () => {
  try {
    console.log('🧪 Testing generation fix...');

    // Step 0: Get authentication token
    console.log('🔐 Getting authentication token...');
    const authToken = await getAuthToken();
    console.log('✅ Authentication successful');

    // Step 1: Create project with complete wizard data
    const projectData = {
      name: 'Test Project Fix',
      description: 'Testing the 400 error fix',
      type: 'Business Website',
      wizardData: {
        businessInfo: {
          name: 'Test Business',
          description: 'A test business for verification',
          industry: 'Technology'
        },
        websiteType: {
          category: 'business'
        },
        businessCategory: {
          name: 'Technology'
        },
        websitePurpose: {
          goals: ['Generate leads', 'Showcase products']
        },
        themeConfig: {
          hugoTheme: 'ananke'
        },
        designPreferences: {
          style: 'modern',
          colors: ['blue', 'white']
        },
        contentRequirements: {
          pages: ['home', 'about', 'contact'],
          tone: 'professional'
        }
      }
    };

    console.log('📝 Creating project...');
    const projectResponse = await axios.post(`${API_BASE}/projects`, projectData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const projectId = projectResponse.data.data ? projectResponse.data.data.id : projectResponse.data.id;
    console.log('✅ Project created:', projectId);
    console.log('🔍 Project completion status:', projectResponse.data.data ? projectResponse.data.data.isCompleted : projectResponse.data.isCompleted);

    // Step 2: Check health endpoint
    console.log('🏥 Checking generation readiness...');
    try {
      const healthResponse = await axios.get(`${API_BASE}/health/generation-readiness/${projectId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('📊 Health check result:', healthResponse.data);
    } catch (healthError) {
      console.log('⚠️ Health check failed:', healthError.response?.data);
    }

    // Step 3: Immediately try to generate (should work now)
    console.log('🚀 Starting generation...');
    const generationResponse = await axios.post(
      `${API_BASE}/generations/${projectId}/start`,
      {
        hugoTheme: 'ananke',
        contentOptions: { tone: 'professional' }
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('🎉 Generation started successfully!');
    console.log('📊 Generation ID:', generationResponse.data.data.generationId);

    return true;

  } catch (error) {
    console.error('❌ Test failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return false;
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testGenerationFix().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testGenerationFix };

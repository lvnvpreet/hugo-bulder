const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Test function to reproduce the 400 error from browser
const testBrowserGeneration = async () => {
  try {
    console.log('🔍 Testing browser-like generation request...');

    // Login to get token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'TestPass123!'
    });
    const token = loginResponse.data.data.token;
    console.log('✅ Got auth token');

    // Create a project first
    const projectData = {
      name: 'Browser Test Project',
      description: 'Testing browser-like request',
      wizardData: {
        businessInfo: {
          name: 'Test Business',
          description: 'A test business',
          industry: 'Technology'
        },
        websiteType: { category: 'business' },
        businessCategory: { name: 'Technology' },
        websitePurpose: { goals: ['Generate leads', 'Showcase products'] },
        themeConfig: { hugoTheme: 'ananke' },
        designPreferences: { style: 'modern', colors: ['blue', 'white'] },
        contentRequirements: { pages: ['home', 'about', 'contact'], tone: 'professional' }
      },
      type: 'Business Website'
    };

    console.log('📝 Creating project...');
    const projectResponse = await axios.post(`${API_BASE}/projects`, projectData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const projectId = projectResponse.data.data.id;
    console.log('✅ Project created:', projectId);

    // Now make the exact request the browser is making
    const generationRequest = {
      autoDetectTheme: true,
      customizations: {
        colors: {
          primary: '#2563eb',
          secondary: '#3b82f6'
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter'
        }
      },
      contentOptions: {
        tone: 'professional',
        includeImages: true,
        generateSampleContent: true
      }
    };

    console.log('🚀 Making generation request...');
    console.log('📤 Request data:', JSON.stringify(generationRequest, null, 2));

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
    console.error('  Data:', error.response?.data);
    console.error('  Headers:', error.response?.headers);
    if (error.response?.status === 400) {
      console.log('🔍 This is the 400 error we\'re investigating!');
    }
  }
};

// Run the test
testBrowserGeneration();

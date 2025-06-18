const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');

const execAsync = promisify(exec);
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

async function testProjectCreation() {
  try {
    console.log('🧪 Testing project creation flow...');
    
    // Step 0: Get authentication token
    console.log('0. Getting authentication token...');
    const token = await getAuthToken();
    console.log('✅ Got auth token');
    
    // Test if backend is running
    console.log('1. Checking if backend is accessible...');
      const testData = {
      name: "Test Project for ID Check",
      description: "Testing if project IDs are generated and stored properly",
      websiteType: "business", // Required field
      wizardData: {
        businessInfo: {
          businessName: "Test Business",
          industry: "technology",
          description: "A test business"
        },
        targetAudience: {
          demographics: "professionals",
          interests: ["technology"]
        }
      }
    };// Create curl command to test project creation
    const jsonData = JSON.stringify(testData).replace(/"/g, '\\"');
    const curlCommand = `curl -X POST http://localhost:3001/api/projects ` +
      `-H "Content-Type: application/json" ` +
      `-H "Authorization: Bearer ${token}" ` +
      `-d "${jsonData}"`;
    
    console.log('2. Creating new project...');
    console.log('Command:', curlCommand);
    
    const result = await execAsync(curlCommand);
    console.log('✅ Project creation response:');
    console.log(result.stdout);
    
    // Parse the response to get the project ID
    try {
      const response = JSON.parse(result.stdout);
      if (response.success && response.data && response.data.id) {
        const projectId = response.data.id;
        console.log(`🎯 New Project ID: ${projectId}`);
          // Test if the project exists by trying to fetch it
        const fetchCommand = `curl -H "Authorization: Bearer ${token}" http://localhost:3001/api/projects/${projectId}`;
        console.log('3. Verifying project exists in database...');
        
        const fetchResult = await execAsync(fetchCommand);
        console.log('✅ Project fetch response:');
        console.log(fetchResult.stdout);
        
        const fetchResponse = JSON.parse(fetchResult.stdout);
        if (fetchResponse.success) {
          console.log('🎉 SUCCESS: Project ID is properly generated and stored in database!');
          console.log(`   - Project ID: ${projectId}`);
          console.log(`   - Project Name: ${fetchResponse.data.name}`);
          console.log(`   - Created At: ${fetchResponse.data.createdAt}`);
        } else {
          console.log('❌ FAIL: Project was created but cannot be fetched');
        }
      } else {
        console.log('❌ FAIL: Project creation did not return a valid ID');
      }
    } catch (parseError) {
      console.log('❌ Error parsing response:', parseError.message);
      console.log('Raw response:', result.stdout);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Backend server is not running. Please start it with:');
      console.log('   cd backend && npm run dev');
    }
  }
}

console.log('🚀 Starting project creation test...');
testProjectCreation();

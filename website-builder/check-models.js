const axios = require('axios');

const checkModels = async () => {
  try {
    console.log('🔍 Checking available models...');
    
    // Check AI engine models
    const aiEngineResponse = await axios.get('http://localhost:3002/api/v1/models/list');
    console.log('📋 AI Engine models:', aiEngineResponse.data);
    
  } catch (error) {
    console.error('❌ Failed to check models:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
};

checkModels();

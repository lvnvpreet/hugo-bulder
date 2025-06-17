const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Use the fresh token from our login
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWMwYnBjZGswMDA3aWNvcHU5ZGJyMjI0IiwiaWF0IjoxNzUwMTUyNjk3LCJleHAiOjE3NTA3NTc0OTd9.vjhvvc39T-U61zVEAqsFu9zmBBa64mj7hCOezoY4x0o';

const monitorHealthCheck = async () => {
  try {
    console.log('🔍 Testing system health...');
    
    // Test system health (no auth needed)
    try {
      const systemHealth = await axios.get(`${API_BASE}/health/system`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
      });
      console.log('✅ System Health:', systemHealth.data);
    } catch (error) {
      console.log('❌ System health check failed:', error.response?.status);
    }

    // Test project list to see our test project
    console.log('\n🔍 Checking projects...');
    const projectsResponse = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    
    const projects = projectsResponse.data.data.projects;
    console.log(`📋 Found ${projects.length} project(s):`);
    
    projects.forEach(project => {
      console.log(`  - ${project.name} (ID: ${project.id.substring(0, 8)}...) - Completed: ${project.isCompleted}`);
    });

    // Test generation readiness for the first project
    if (projects.length > 0) {
      const projectId = projects[0].id;
      console.log(`\n🔍 Testing generation readiness for project: ${projectId.substring(0, 8)}...`);
      
      const readiness = await axios.get(`${API_BASE}/health/generation-readiness/${projectId}`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
      });
      
      console.log('📊 Generation Readiness:', readiness.data);
      
      if (readiness.data.ready) {
        console.log('🎉 Project is ready for generation!');
      } else {
        console.log('⚠️ Project is not ready:', readiness.data.reason);
      }
    }

  } catch (error) {
    console.error('❌ Monitoring failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
};

monitorHealthCheck();

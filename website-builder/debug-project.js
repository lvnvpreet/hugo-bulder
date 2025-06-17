const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

const debugProjectStatus = async () => {
  try {
    // Get fresh token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test2@example.com',
      password: 'TestPass123!'
    });
    const token = loginResponse.data.data.token;

    // Get all projects for this user
    const projectsResponse = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const projects = projectsResponse.data.data.projects;
    console.log(`📋 Found ${projects.length} project(s):`);

    projects.forEach(project => {
      console.log(`\n📊 Project: ${project.name}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   isCompleted: ${project.isCompleted}`);
      console.log(`   currentStep: ${project.currentStep}`);
      console.log(`   completedSteps: ${project.completedSteps}/${project.totalSteps}`);
      console.log(`   hasWizardData: ${!!project.wizardData}`);
      console.log(`   generationStatus: ${project.generationStatus}`);
    });

    // Test generation readiness for the first project
    if (projects.length > 0) {
      const projectId = projects[0].id;
      console.log(`\n🔍 Testing generation readiness for: ${projectId}`);
      
      try {
        const readiness = await axios.get(`${API_BASE}/health/generation-readiness/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Readiness check:', readiness.data);
      } catch (error) {
        console.log('❌ Readiness check failed:', error.response?.data);
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
};

debugProjectStatus();

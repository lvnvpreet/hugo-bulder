const fs = require('fs');

// Read the test data
const testData = JSON.parse(fs.readFileSync('test-generation.json', 'utf8'));

console.log('Sending test data:', JSON.stringify(testData, null, 2));

// Make the API call
async function testAPI() {
  try {
    const response = await fetch('http://localhost:3003/api/generation/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();

const axios = require('axios');

async function testBackendPort() {
  const ports = [3000, 5000];
  
  for (const port of ports) {
    try {
      console.log(`🔍 Testing port ${port}...`);
      const response = await axios.get(`http://localhost:${port}/`, { timeout: 2000 });
      console.log(`✅ Backend found on port ${port}`);
      console.log(`📊 Response:`, response.data);
      return port;
    } catch (error) {
      console.log(`❌ Port ${port} not responding`);
    }
  }
  
  console.log('❌ Backend not found on any tested port');
  return null;
}

// Test the backend port
testBackendPort().then(port => {
  if (port) {
    console.log(`🎯 Backend is running on port ${port}`);
  } else {
    console.log('🚨 No backend found. Please start the backend server.');
  }
});

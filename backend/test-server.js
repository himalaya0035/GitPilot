/**
 * Test server to verify backend functionality
 * Simple test to ensure all components work together
 */

const { app, server, io } = require('./index');
const DataLayer = require('./data/DataLayer');
const MemoryAdapter = require('./data/adapters/MemoryAdapter');

// Test data layer
async function testDataLayer() {
  console.log('🧪 Testing Data Layer...');
  
  const memoryAdapter = new MemoryAdapter('test-');
  const dataLayer = new DataLayer(memoryAdapter);

  // Test workflow data
  const testWorkflow = {
    name: 'Test Workflow',
    description: 'A test workflow for validation',
    branches: [
      {
        id: 'main',
        name: 'main',
        type: 'production',
        isRemote: true,
        position: { x: 100, y: 100 }
      },
      {
        id: 'feature',
        name: 'feature/test',
        type: 'feature',
        isRemote: false,
        position: { x: 300, y: 100 }
      }
    ],
    operations: [
      {
        id: 'op1',
        type: 'checkout',
        source: 'main',
        target: 'feature',
        params: { new: true }
      }
    ]
  };

  try {
    // Test save
    const saved = await dataLayer.saveWorkflow(testWorkflow);
    console.log('✅ Workflow saved:', saved.id);

    // Test get
    const retrieved = await dataLayer.getWorkflow(saved.id);
    console.log('✅ Workflow retrieved:', retrieved.name);

    // Test get all
    const all = await dataLayer.getAllWorkflows();
    console.log('✅ All workflows:', all.length);

    // Test search
    const searchResults = await dataLayer.searchWorkflows('Test');
    console.log('✅ Search results:', searchResults.length);

    // Test stats
    const stats = await dataLayer.getStats();
    console.log('✅ Stats:', stats);

    console.log('🎉 Data Layer tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Data Layer test failed:', error);
    return false;
  }
}

// Test API endpoints
async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints...');
  
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Test health check
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);

    // Test workflows endpoint
    const workflowsResponse = await fetch(`${baseUrl}/api/workflows`);
    const workflowsData = await workflowsResponse.json();
    console.log('✅ Workflows endpoint:', workflowsData.count, 'workflows');

    console.log('🎉 API tests passed!');
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Backend Tests...\n');
  
  const dataLayerTest = await testDataLayer();
  console.log('');
  
  // Wait a bit for server to start
  setTimeout(async () => {
    const apiTest = await testAPIEndpoints();
    console.log('');
    
    if (dataLayerTest && apiTest) {
      console.log('🎉 All tests passed! Backend is ready.');
    } else {
      console.log('❌ Some tests failed. Check the logs above.');
    }
  }, 2000);
}

// Export for manual testing
module.exports = { testDataLayer, testAPIEndpoints, runTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}
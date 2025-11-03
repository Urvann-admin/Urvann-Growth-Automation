/**
 * Test script for Bulk Product Count API
 * 
 * This script tests the optimized bulk endpoint with sample data
 * to verify performance and functionality.
 * 
 * Usage: node scripts/testBulkApi.js
 */

const API_URL = 'http://localhost:3000/api/products/count/bulk';

// Sample test data (small set for quick testing)
const testData = {
  small: {
    categories: ['plants', 'seeds', 'pots', 'fertilizers', 'tools'],
    substores: ['main', 'premium', 'organic']
  },
  medium: {
    categories: [
      'plants', 'seeds', 'pots', 'fertilizers', 'tools',
      'garden-decor', 'planters', 'grow-bags', 'soil',
      'watering-cans', 'garden-tools', 'pesticides',
      'plant-food', 'indoor-plants', 'outdoor-plants'
    ],
    substores: ['main', 'premium', 'organic', 'budget', 'luxury']
  }
};

async function testBulkApi(testSize = 'small') {
  const data = testData[testSize];
  const totalRequests = data.categories.length * data.substores.length;
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING BULK PRODUCT COUNT API');
  console.log('='.repeat(80));
  console.log(`📦 Test size: ${testSize.toUpperCase()}`);
  console.log(`📊 Categories: ${data.categories.length}`);
  console.log(`🏪 Substores: ${data.substores.length}`);
  console.log(`🎯 Total requests: ${totalRequests}`);
  console.log('='.repeat(80) + '\n');
  
  const startTime = Date.now();
  
  try {
    console.log('🚀 Sending request to:', API_URL);
    console.log('⏳ Please wait...\n');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        categories: data.categories,
        substores: data.substores
      })
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`⏱️  Total time: ${elapsed}s`);
    
    if (result.stats) {
      console.log('\n📊 Performance Statistics:');
      console.log(`   Total requests: ${result.stats.total}`);
      console.log(`   Successful: ${result.stats.successful}`);
      console.log(`   Failed: ${result.stats.failed}`);
      console.log(`   Rate limited: ${result.stats.rateLimited}`);
      console.log(`   Time elapsed: ${result.stats.timeElapsed}`);
      console.log(`   Average rate: ${result.stats.averageRate}`);
      console.log(`   Avg response time: ${result.stats.averageResponseTime}`);
    }
    
    if (result.data) {
      console.log('\n📦 Sample Results:');
      const categories = Object.keys(result.data);
      const firstCategory = categories[0];
      const substores = Object.keys(result.data[firstCategory]);
      
      console.log(`   ${firstCategory}:`);
      substores.forEach(substore => {
        console.log(`      ${substore}: ${result.data[firstCategory][substore]} products`);
      });
      
      if (categories.length > 1) {
        console.log(`   ... and ${categories.length - 1} more categories`);
      }
    }
    
    // Calculate performance metrics
    const requestsPerSecond = (totalRequests / parseFloat(elapsed)).toFixed(1);
    const avgTimePerRequest = (parseFloat(elapsed) * 1000 / totalRequests).toFixed(0);
    
    console.log('\n🎯 Performance Metrics:');
    console.log(`   Throughput: ${requestsPerSecond} requests/second`);
    console.log(`   Avg time per request: ${avgTimePerRequest}ms`);
    
    // Estimate for full load (4,620 requests)
    const fullLoadEstimate = (4620 / parseFloat(requestsPerSecond)).toFixed(1);
    console.log(`   Estimated time for 4,620 requests: ${fullLoadEstimate}s`);
    
    console.log('='.repeat(80) + '\n');
    
    return result;
    
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(80));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(80));
    console.log(`⏱️  Time before failure: ${elapsed}s`);
    console.log(`❌ Error: ${error.message}`);
    console.log('='.repeat(80) + '\n');
    
    throw error;
  }
}

// Main execution
async function main() {
  const testSize = process.argv[2] || 'small';
  
  if (!testData[testSize]) {
    console.error(`❌ Invalid test size: ${testSize}`);
    console.error(`   Available sizes: ${Object.keys(testData).join(', ')}`);
    process.exit(1);
  }
  
  try {
    await testBulkApi(testSize);
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { testBulkApi };


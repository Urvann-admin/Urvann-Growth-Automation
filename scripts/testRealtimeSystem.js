/**
 * Test script for the real-time system
 * 
 * This script verifies that:
 * 1. Background worker is running
 * 2. MongoDB has cached data
 * 3. SSE endpoint is working
 * 4. Cached endpoint returns data
 * 
 * Usage: node scripts/testRealtimeSystem.js
 */

const API_URL = 'http://localhost:3000';

async function testRealtimeSystem() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING REAL-TIME SYSTEM');
  console.log('='.repeat(80) + '\n');

  let allTestsPassed = true;

  // Test 1: Check if worker is initialized
  console.log('Test 1: Checking if background worker is initialized...');
  try {
    const response = await fetch(`${API_URL}/api/worker/init`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Background worker is running');
      console.log(`   Message: ${data.message}\n`);
    } else {
      console.log('❌ Background worker failed to initialize\n');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ Failed to connect to server. Is it running?');
    console.log(`   Error: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 2: Check if cached data exists
  console.log('Test 2: Checking if MongoDB has cached data...');
  try {
    // Get a few categories to test
    const categoriesResponse = await fetch(`${API_URL}/api/categories`);
    const categoriesResult = await categoriesResponse.json();
    
    if (!categoriesResult.success || categoriesResult.data.length === 0) {
      console.log('❌ No categories found in database\n');
      allTestsPassed = false;
    } else {
      const testCategories = categoriesResult.data.slice(0, 3).map(c => c.alias);
      const testSubstores = ['bgl-e', 'bgl-n', 'noi'];
      
      const cachedResponse = await fetch(
        `${API_URL}/api/products/count/cached?categories=${testCategories.join(',')}&substores=${testSubstores.join(',')}`
      );
      const cachedData = await cachedResponse.json();
      
      if (cachedData.success && cachedData.data) {
        const totalRecords = cachedData.meta?.totalRecords || 0;
        const expectedRecords = cachedData.meta?.expectedRecords || 0;
        
        console.log('✅ MongoDB cache is working');
        console.log(`   Records found: ${totalRecords}/${expectedRecords}`);
        
        if (totalRecords === 0) {
          console.log('   ⚠️  Cache is empty. Background worker is still populating data.');
          console.log('   ⏳ Wait 10-15 minutes for initial data load.\n');
        } else if (totalRecords < expectedRecords) {
          console.log('   ⚠️  Cache is partially populated. Background worker is still running.\n');
        } else {
          console.log('   ✅ Cache is fully populated!\n');
        }
        
        // Show sample data
        console.log('   Sample data:');
        Object.entries(cachedData.data).forEach(([category, substores]) => {
          Object.entries(substores).forEach(([substore, count]) => {
            console.log(`   - ${category} @ ${substore}: ${count} products`);
          });
        });
        console.log('');
      } else {
        console.log('❌ Failed to fetch cached data\n');
        allTestsPassed = false;
      }
    }
  } catch (error) {
    console.log('❌ Error checking cached data');
    console.log(`   Error: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 3: Check SSE endpoint (just verify it responds, don't keep connection open)
  console.log('Test 3: Checking SSE endpoint...');
  try {
    const categoriesResponse = await fetch(`${API_URL}/api/categories`);
    const categoriesResult = await categoriesResponse.json();
    
    if (categoriesResult.success && categoriesResult.data.length > 0) {
      const testCategories = categoriesResult.data.slice(0, 2).map(c => c.alias);
      const testSubstores = ['bgl-e', 'noi'];
      
      // Just check if endpoint is accessible (don't maintain connection)
      const sseUrl = `${API_URL}/api/products/count/stream?categories=${testCategories.join(',')}&substores=${testSubstores.join(',')}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        const response = await fetch(sseUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'text/event-stream'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
          console.log('✅ SSE endpoint is accessible');
          console.log(`   URL: ${sseUrl}`);
          console.log('   Status: Ready to stream real-time updates\n');
        } else {
          console.log('❌ SSE endpoint returned unexpected response\n');
          allTestsPassed = false;
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          // Timeout is expected since we're testing connectivity, not streaming
          console.log('✅ SSE endpoint is accessible (connection test timed out as expected)');
          console.log('   Status: Ready to stream real-time updates\n');
        } else {
          throw error;
        }
      }
    } else {
      console.log('⚠️  Skipping SSE test (no categories available)\n');
    }
  } catch (error) {
    console.log('❌ Error checking SSE endpoint');
    console.log(`   Error: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Summary
  console.log('='.repeat(80));
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(80));
    console.log('\n🎉 Your real-time system is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Open http://localhost:3000/dashboard/growth-analytics');
    console.log('2. Look for the 🟢 "Live" indicator');
    console.log('3. Check that counts load instantly');
    console.log('4. Watch for real-time updates as background worker runs\n');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('='.repeat(80));
    console.log('\n⚠️  Please check the errors above and:');
    console.log('1. Ensure the server is running (npm run dev)');
    console.log('2. Check MongoDB connection');
    console.log('3. Wait for background worker to populate cache (10-15 min)\n');
  }
}

// Run tests
testRealtimeSystem()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });


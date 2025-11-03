/**
 * Test script to populate cache with SMALL dataset
 * 
 * This tests with just 5 categories and 3 substores (15 requests)
 * to verify the caching system works correctly
 * 
 * Usage: node scripts/testCacheSmall.js
 */

const API_URL = 'http://localhost:3000';

async function testSmallCache() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING CACHE WITH SMALL DATASET');
  console.log('='.repeat(80));
  console.log('This will take ~30 seconds and help debug the caching system\n');
  
  try {
    // Step 1: Fetch all categories
    console.log('📦 Step 1: Fetching categories...');
    const categoriesResponse = await fetch(`${API_URL}/api/categories`);
    const categoriesResult = await categoriesResponse.json();
    
    if (!categoriesResult.success) {
      throw new Error('Failed to fetch categories');
    }
    
    // Use only first 5 categories for testing
    const allCategories = categoriesResult.data.map(c => c.alias);
    const testCategories = allCategories.slice(0, 5);
    
    // Use only 3 substores for testing
    const testSubstores = ['bgl-e', 'bgl-n', 'noi'];
    
    console.log(`✅ Testing with ${testCategories.length} categories: ${testCategories.join(', ')}`);
    console.log(`✅ Testing with ${testSubstores.length} substores: ${testSubstores.join(', ')}`);
    console.log(`🎯 Total combinations: ${testCategories.length * testSubstores.length}\n`);
    
    // Step 2: Trigger background refresh
    console.log('🚀 Step 2: Starting background refresh...');
    console.log('Watch the server terminal for detailed logs!\n');
    
    const startTime = Date.now();
    
    const refreshResponse = await fetch(`${API_URL}/api/products/count/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        categories: testCategories,
        substores: testSubstores,
        mode: 'full'
      })
    });
    
    const refreshResult = await refreshResponse.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (refreshResult.success) {
      console.log('='.repeat(80));
      console.log('✅ TEST REFRESH COMPLETED');
      console.log('='.repeat(80));
      console.log(`⏱️  Total time: ${elapsed}s`);
      console.log(`✅ Updated: ${refreshResult.stats.updated}`);
      console.log(`❌ Failed: ${refreshResult.stats.failed}`);
      console.log(`📊 Success rate: ${refreshResult.stats.successRate}`);
      console.log('='.repeat(80) + '\n');
      
      // Step 3: Fetch from cache to verify
      console.log('🔍 Step 3: Fetching from cache to verify...\n');
      
      const queryParams = new URLSearchParams({
        categories: testCategories.join(','),
        substores: testSubstores.join(','),
      });
      
      const cachedResponse = await fetch(`${API_URL}/api/products/count/cached?${queryParams}`);
      const cachedResult = await cachedResponse.json();
      
      if (cachedResult.success) {
        console.log('✅ CACHE VERIFICATION SUCCESSFUL');
        console.log('='.repeat(80));
        console.log('📊 Cached Data Sample:');
        
        // Show first category's data
        const firstCategory = testCategories[0];
        console.log(`\n${firstCategory}:`);
        testSubstores.forEach(substore => {
          const count = cachedResult.data[firstCategory]?.[substore] || 0;
          console.log(`  ${substore}: ${count} products`);
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('💡 Check the server logs above to see:');
        console.log('   - What the Urvann API returned');
        console.log('   - What was saved to the database');
        console.log('   - Any errors or issues');
        console.log('='.repeat(80) + '\n');
        
        // Check if all are 0 or 1 (indicating a problem)
        let allZero = true;
        let allOne = true;
        testCategories.forEach(cat => {
          testSubstores.forEach(sub => {
            const count = cachedResult.data[cat]?.[sub] || 0;
            if (count !== 0) allZero = false;
            if (count !== 1) allOne = false;
          });
        });
        
        if (allZero) {
          console.log('⚠️  WARNING: All counts are 0! Check server logs for API errors.\n');
        } else if (allOne) {
          console.log('⚠️  WARNING: All counts are 1! This suggests an API parsing issue.\n');
        } else {
          console.log('🎉 SUCCESS: Counts look varied and correct!\n');
        }
        
      } else {
        console.error('❌ Failed to fetch from cache:', cachedResult.message);
      }
      
    } else {
      throw new Error(refreshResult.message || 'Refresh failed');
    }
    
  } catch (error) {
    console.error('\n❌ Error in test:', error.message);
    console.error('\nMake sure:');
    console.error('1. Your dev server is running (npm run dev)');
    console.error('2. MongoDB is connected');
    console.error('3. You have network access to Urvann API\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testSmallCache()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testSmallCache };


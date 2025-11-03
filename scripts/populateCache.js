/**
 * Script to populate the product count cache
 * 
 * This script fetches all product counts and stores them in the database
 * Run this once to initialize the cache, then set up a cron job to run periodically
 * 
 * Usage: node scripts/populateCache.js
 */

const API_URL = 'http://localhost:3000';

async function populateCache() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 POPULATING PRODUCT COUNT CACHE');
  console.log('='.repeat(80));
  console.log('This will take 3-5 minutes but only needs to run once!\n');
  
  try {
    // Step 1: Fetch all categories
    console.log('📦 Step 1: Fetching categories...');
    const categoriesResponse = await fetch(`${API_URL}/api/categories`);
    const categoriesResult = await categoriesResponse.json();
    
    if (!categoriesResult.success) {
      throw new Error('Failed to fetch categories');
    }
    
    const categories = categoriesResult.data.map(c => c.alias);
    const substores = [
      'bgl-e', 'bgl-e2', 'bgl-n', 'bgl-n2', 'bgl-s1', 'bgl-s2', 
      'bgl-w1', 'bgl-w2', 'noi', 'ghaziabad', 'sdel', 'sdelhi', 
      'rohini', 'roh', 'uttam', 'dwarka', 'dncr', 'gurugram', 
      'greaternoida', 'kalkaji', 'vasantkunj'
    ];
    
    console.log(`✅ Found ${categories.length} categories`);
    console.log(`✅ Using ${substores.length} substores`);
    console.log(`🎯 Total combinations: ${categories.length * substores.length}\n`);
    
    // Step 2: Trigger background refresh
    console.log('🚀 Step 2: Starting background refresh...');
    console.log('This will take a few minutes. Watch the server logs for progress.\n');
    
    const startTime = Date.now();
    
    const refreshResponse = await fetch(`${API_URL}/api/products/count/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        categories: categories,
        substores: substores,
        mode: 'full'
      })
    });
    
    const refreshResult = await refreshResponse.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (refreshResult.success) {
      console.log('='.repeat(80));
      console.log('✅ CACHE POPULATION COMPLETED');
      console.log('='.repeat(80));
      console.log(`⏱️  Total time: ${elapsed}s`);
      console.log(`✅ Updated: ${refreshResult.stats.updated}`);
      console.log(`❌ Failed: ${refreshResult.stats.failed}`);
      console.log(`📊 Success rate: ${refreshResult.stats.successRate}`);
      console.log('='.repeat(80));
      console.log('\n🎉 Your dashboard will now load instantly!');
      console.log('💡 Set up a cron job to run this script every 6-12 hours to keep data fresh.\n');
    } else {
      throw new Error(refreshResult.message || 'Refresh failed');
    }
    
  } catch (error) {
    console.error('\n❌ Error populating cache:', error.message);
    console.error('\nMake sure:');
    console.error('1. Your dev server is running (npm run dev)');
    console.error('2. MongoDB is connected');
    console.error('3. You have network access to Urvann API\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateCache()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { populateCache };


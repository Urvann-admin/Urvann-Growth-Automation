// Quick test to see actual category count
async function testRealLoad() {
  try {
    console.log('Fetching categories from your API...\n');
    
    const response = await fetch('http://localhost:3000/api/categories');
    const result = await response.json();
    
    if (result.success) {
      const categories = result.data;
      const substores = ['bgl-e', 'bgl-e2', 'bgl-n', 'bgl-n2', 'bgl-s1', 'bgl-s2', 'bgl-w1', 'bgl-w2', 'noi', 'ghaziabad', 'sdel', 'sdelhi', 'rohini', 'roh', 'uttam', 'dwarka', 'dncr', 'gurugram', 'greaternoida', 'kalkaji', 'vasantkunj'];
      
      console.log(`📊 Total categories: ${categories.length}`);
      console.log(`🏪 Total substores: ${substores.length}`);
      console.log(`🎯 Total requests needed: ${categories.length * substores.length}`);
      console.log(`\nNow testing bulk API with ALL your data...\n`);
      
      const startTime = Date.now();
      
      const bulkResponse = await fetch('http://localhost:3000/api/products/count/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: categories.map(c => c.alias),
          substores: substores
        })
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const bulkResult = await bulkResponse.json();
      
      console.log('='.repeat(80));
      console.log('✅ BULK API TEST COMPLETE');
      console.log('='.repeat(80));
      console.log(`⏱️  Total time: ${elapsed}s`);
      
      if (bulkResult.stats) {
        console.log(`📊 Total requests: ${bulkResult.stats.total}`);
        console.log(`✅ Successful: ${bulkResult.stats.successful}`);
        console.log(`❌ Failed: ${bulkResult.stats.failed}`);
        console.log(`⚠️  Rate limited: ${bulkResult.stats.rateLimited}`);
        console.log(`🚀 Average rate: ${bulkResult.stats.averageRate}`);
        console.log(`⚡ Avg response time: ${bulkResult.stats.averageResponseTime}`);
      }
      console.log('='.repeat(80));
      
    } else {
      console.error('Failed to fetch categories');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRealLoad();

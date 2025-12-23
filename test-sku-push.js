// Quick test script for pushing frequently bought data for SKU MUN0355P
// Run with: node test-sku-push.js

const API_BASE = 'http://localhost:3000'; // Change if your server is on a different port

async function testSkuPush() {
  try {
    console.log('🔍 Finding product_id for SKU: MUN0355P...');
    
    // First, get the product_id for MUN0355P
    const mappingResponse = await fetch(`${API_BASE}/api/frequently-bought/all-mappings`);
    const mappingData = await mappingResponse.json();
    
    if (!mappingData.success) {
      console.error('❌ Failed to fetch mappings:', mappingData.message);
      return;
    }
    
    const mappings = mappingData.data;
    const skuMapping = mappings['MUN0355P'];
    
    if (!skuMapping) {
      console.error('❌ SKU MUN0355P not found in mappings');
      return;
    }
    
    const productId = skuMapping.product_id;
    console.log(`✅ Found product_id: ${productId}`);
    console.log(`   Publish: ${skuMapping.publish}, Inventory: ${skuMapping.inventory}`);
    
    // Find some valid SKUs to use as frequently bought together
    console.log('\n🔍 Finding valid test SKUs...');
    const validSkus = Object.entries(mappings)
      .filter(([sku, mapping]) => {
        return sku !== 'MUN0355P' && 
               mapping.publish === '1' && 
               mapping.inventory > 0 &&
               mapping.substore !== 'hubchange' &&
               mapping.substore !== 'test4' &&
               mapping.price !== 1;
      })
      .slice(0, 5)
      .map(([sku]) => sku);
    
    if (validSkus.length === 0) {
      console.error('❌ No valid SKUs found for testing');
      return;
    }
    
    console.log(`✅ Found ${validSkus.length} valid test SKUs:`, validSkus);
    
    // Now test the push
    console.log('\n🚀 Testing push for MUN0355P...');
    const testResponse = await fetch(`${API_BASE}/api/frequently-bought/test-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: productId,
        testSkus: validSkus,
      }),
    });
    
    const result = await testResponse.json();
    
    console.log('\n📊 Test Results:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.verification?.success) {
      console.log('\n✅ SUCCESS: Update was pushed and verified!');
    } else if (result.pushResult?.success && !result.verification?.success) {
      console.log('\n⚠️  WARNING: Push succeeded but verification failed - API may not be updating the field');
    } else {
      console.log('\n❌ FAILED: Push did not succeed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSkuPush();


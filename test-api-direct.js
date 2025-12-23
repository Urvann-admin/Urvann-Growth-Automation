// Direct API test to see what the Urvann API actually expects
// Run with: node test-api-direct.js

const BASE_URL = 'https://www.urvann.com';
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

// First, let's get a product to see its structure
async function testDirect() {
  try {
    // Get product_id for MUN0355P from your local API
    console.log('Step 1: Getting product_id for MUN0355P...');
    const mappingRes = await fetch('http://localhost:3000/api/frequently-bought/all-mappings');
    const mappingData = await mappingRes.json();
    
    if (!mappingData.success) {
      console.error('Failed to get mappings');
      return;
    }
    
    const skuMapping = mappingData.data['MUN0355P'];
    if (!skuMapping) {
      console.error('SKU MUN0355P not found');
      return;
    }
    
    const productId = skuMapping.product_id;
    console.log(`Product ID: ${productId}`);
    
    // Step 2: Fetch the product to see its current structure
    console.log('\nStep 2: Fetching product to see structure...');
    const getUrl = `${BASE_URL}/api/1.1/entity/ms.products/${productId}`;
    const getResponse = await fetch(getUrl, {
      headers: {
        'access-key': ACCESS_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!getResponse.ok) {
      console.error(`Failed to fetch: ${getResponse.status} ${getResponse.statusText}`);
      const errorText = await getResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const product = await getResponse.json();
    console.log('\nCurrent product structure:');
    console.log('Fields:', Object.keys(product).slice(0, 20));
    console.log('\nFrequently bought together field:');
    console.log('frequently_bought_together:', product.frequently_bought_together);
    console.log('frequentlyBoughtTogether:', product.frequentlyBoughtTogether);
    console.log('data.frequently_bought_together:', product.data?.frequently_bought_together);
    
    // Step 3: Try updating with different field names
    const testSkus = ['TEST1', 'TEST2', 'TEST3'];
    
    console.log('\nStep 3: Testing PUT with frequently_bought_together...');
    const putUrl = `${BASE_URL}/api/1.1/entity/ms.products/${productId}`;
    const putResponse = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'access-key': ACCESS_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frequently_bought_together: testSkus,
      }),
    });
    
    console.log(`PUT Response Status: ${putResponse.status} ${putResponse.statusText}`);
    const putResponseText = await putResponse.text();
    console.log('PUT Response Body:', putResponseText.substring(0, 500));
    
    // Step 4: Verify by fetching again
    console.log('\nStep 4: Verifying update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const verifyResponse = await fetch(getUrl, {
      headers: {
        'access-key': ACCESS_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    const verifyProduct = await verifyResponse.json();
    console.log('\nAfter update:');
    console.log('frequently_bought_together:', verifyProduct.frequently_bought_together);
    console.log('frequentlyBoughtTogether:', verifyProduct.frequentlyBoughtTogether);
    console.log('data.frequently_bought_together:', verifyProduct.data?.frequently_bought_together);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDirect();


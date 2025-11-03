/**
 * Quick script to check what category aliases look like in the database
 */

const API_URL = 'http://localhost:3000';

async function checkCategories() {
  try {
    const response = await fetch(`${API_URL}/api/categories`);
    const result = await response.json();
    
    if (result.success) {
      console.log('\n📦 First 10 Category Aliases:');
      console.log('='.repeat(80));
      result.data.slice(0, 10).forEach((cat, i) => {
        console.log(`${i + 1}. Alias: "${cat.alias}" | Category: "${cat.category}"`);
      });
      console.log('='.repeat(80) + '\n');
      
      return result.data.map(c => c.alias);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCategories();


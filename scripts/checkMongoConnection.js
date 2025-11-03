/**
 * Check MongoDB Connection and Database Setup
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkConnection() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING MONGODB CONNECTION');
  console.log('='.repeat(80) + '\n');

  const uri = process.env.MONGODB_URI_COPY || process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ No MongoDB URI found in environment variables\n');
    return;
  }

  console.log('📋 MongoDB URI found (showing first 30 chars):');
  console.log(`   ${uri.substring(0, 30)}...\n`);

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });

  try {
    console.log('📡 Attempting to connect...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // List databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    
    console.log('📂 Available databases:');
    dbs.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    console.log('');

    // Check GrowthAutomation database
    const db = client.db('GrowthAutomation');
    const collections = await db.listCollections().toArray();
    
    console.log('📦 Collections in GrowthAutomation database:');
    if (collections.length === 0) {
      console.log('   (No collections yet)\n');
    } else {
      for (const coll of collections) {
        const count = await db.collection(coll.name).countDocuments();
        console.log(`   - ${coll.name} (${count} documents)`);
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✅ MongoDB is accessible and ready!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPossible issues:');
    console.error('1. MongoDB server is not running');
    console.error('2. Network/firewall blocking connection');
    console.error('3. Invalid connection string');
    console.error('4. IP address not whitelisted (for Atlas)\n');
  } finally {
    await client.close();
  }
}

checkConnection()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });


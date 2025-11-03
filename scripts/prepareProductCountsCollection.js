/**
 * Prepare ProductCounts Collection in GrowthAutomation Database
 * 
 * This script:
 * 1. Connects to GrowthAutomation database
 * 2. Drops the existing productcounts collection (if exists)
 * 3. Creates a new productcounts collection with proper indexes
 * 4. Verifies the setup
 * 
 * Usage: node scripts/prepareProductCountsCollection.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI_COPY || process.env.MONGODB_URI;
const DB_NAME = 'GrowthAutomation';
const COLLECTION_NAME = 'productcounts';

async function prepareCollection() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 PREPARING PRODUCTCOUNTS COLLECTION');
  console.log('='.repeat(80) + '\n');

  if (!uri) {
    console.error('❌ MongoDB URI not found in environment variables');
    console.error('   Please ensure MONGODB_URI or MONGODB_URI_COPY is set in .env.local\n');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    console.log(`📂 Using database: ${DB_NAME}\n`);

    // Check if collection exists
    const collections = await db.listCollections({ name: COLLECTION_NAME }).toArray();
    const collectionExists = collections.length > 0;

    if (collectionExists) {
      console.log(`⚠️  Collection "${COLLECTION_NAME}" already exists`);
      console.log('🗑️  Dropping existing collection...');
      await db.collection(COLLECTION_NAME).drop();
      console.log('✅ Collection dropped\n');
    } else {
      console.log(`📋 Collection "${COLLECTION_NAME}" does not exist yet\n`);
    }

    // Create the collection
    console.log('📦 Creating new collection...');
    await db.createCollection(COLLECTION_NAME);
    console.log('✅ Collection created\n');

    const collection = db.collection(COLLECTION_NAME);

    // Create indexes
    console.log('🔍 Creating indexes...');
    
    // 1. Compound unique index on category + substore
    console.log('   - Creating compound index on (category, substore)...');
    await collection.createIndex(
      { category: 1, substore: 1 },
      { unique: true, name: 'category_substore_unique' }
    );
    console.log('     ✅ Compound unique index created');

    // 2. Index on category
    console.log('   - Creating index on category...');
    await collection.createIndex(
      { category: 1 },
      { name: 'category_index' }
    );
    console.log('     ✅ Category index created');

    // 3. Index on substore
    console.log('   - Creating index on substore...');
    await collection.createIndex(
      { substore: 1 },
      { name: 'substore_index' }
    );
    console.log('     ✅ Substore index created');

    // 4. Index on lastUpdated
    console.log('   - Creating index on lastUpdated...');
    await collection.createIndex(
      { lastUpdated: 1 },
      { name: 'lastUpdated_index' }
    );
    console.log('     ✅ LastUpdated index created');

    // 5. Index on isStale
    console.log('   - Creating index on isStale...');
    await collection.createIndex(
      { isStale: 1 },
      { name: 'isStale_index' }
    );
    console.log('     ✅ IsStale index created');

    // 6. Compound index on lastUpdated + isStale
    console.log('   - Creating compound index on (lastUpdated, isStale)...');
    await collection.createIndex(
      { lastUpdated: 1, isStale: 1 },
      { name: 'lastUpdated_isStale_index' }
    );
    console.log('     ✅ Compound index created\n');

    // Verify indexes
    console.log('🔍 Verifying indexes...');
    const indexes = await collection.indexes();
    console.log(`✅ Total indexes created: ${indexes.length}\n`);
    
    console.log('📋 Index details:');
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}`);
      console.log(`      Keys: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log(`      Unique: true`);
    });
    console.log('');

    // Insert a test document
    console.log('🧪 Inserting test document...');
    const testDoc = {
      category: 'test-category',
      substore: 'test-substore',
      count: 0,
      lastUpdated: new Date(),
      isStale: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await collection.insertOne(testDoc);
    console.log('✅ Test document inserted\n');

    // Verify test document
    const foundDoc = await collection.findOne({ category: 'test-category' });
    if (foundDoc) {
      console.log('✅ Test document verified:');
      console.log(`   Category: ${foundDoc.category}`);
      console.log(`   Substore: ${foundDoc.substore}`);
      console.log(`   Count: ${foundDoc.count}`);
      console.log(`   Last Updated: ${foundDoc.lastUpdated}`);
      console.log('');
    }

    // Clean up test document
    console.log('🧹 Cleaning up test document...');
    await collection.deleteOne({ category: 'test-category' });
    console.log('✅ Test document removed\n');

    // Final stats
    const stats = await db.command({ collStats: COLLECTION_NAME });
    console.log('='.repeat(80));
    console.log('✅ COLLECTION PREPARED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`📊 Collection Stats:`);
    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Collection: ${COLLECTION_NAME}`);
    console.log(`   Document count: ${stats.count}`);
    console.log(`   Indexes: ${stats.nindexes}`);
    console.log(`   Storage size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    console.log('='.repeat(80));
    console.log('\n🎉 Collection is ready for use!');
    console.log('\nNext steps:');
    console.log('1. Restart your dev server (npm run dev)');
    console.log('2. Background worker will automatically populate the collection');
    console.log('3. Wait 10-15 minutes for initial data load');
    console.log('4. Open dashboard to see real-time counts\n');

  } catch (error) {
    console.error('\n❌ Error preparing collection:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed\n');
  }
}

// Run the script
prepareCollection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


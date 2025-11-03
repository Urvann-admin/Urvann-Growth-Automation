/**
 * Admin endpoint to prepare the ProductCounts collection
 * This endpoint will drop and recreate the collection with proper indexes
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 PREPARING PRODUCTCOUNTS COLLECTION');
    console.log('='.repeat(80) + '\n');

    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB (GrowthAutomation database)\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collectionName = 'productcounts';

    // Check if collection exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    const collectionExists = collections.length > 0;

    if (collectionExists) {
      console.log(`⚠️  Collection "${collectionName}" already exists`);
      
      // Get current document count
      const currentCount = await db.collection(collectionName).countDocuments();
      console.log(`   Current documents: ${currentCount}`);
      
      console.log('🗑️  Dropping existing collection...');
      await db.collection(collectionName).drop();
      console.log('✅ Collection dropped\n');
    } else {
      console.log(`📋 Collection "${collectionName}" does not exist yet\n`);
    }

    // Create the collection
    console.log('📦 Creating new collection...');
    await db.createCollection(collectionName);
    console.log('✅ Collection created\n');

    const collection = db.collection(collectionName);

    // Create indexes
    console.log('🔍 Creating indexes...');
    
    const indexResults = [];

    // 1. Compound unique index on category + substore
    console.log('   - Creating compound index on (category, substore)...');
    await collection.createIndex(
      { category: 1, substore: 1 },
      { unique: true, name: 'category_substore_unique' }
    );
    indexResults.push('Compound unique index (category, substore)');
    console.log('     ✅ Compound unique index created');

    // 2. Index on category
    console.log('   - Creating index on category...');
    await collection.createIndex(
      { category: 1 },
      { name: 'category_index' }
    );
    indexResults.push('Category index');
    console.log('     ✅ Category index created');

    // 3. Index on substore
    console.log('   - Creating index on substore...');
    await collection.createIndex(
      { substore: 1 },
      { name: 'substore_index' }
    );
    indexResults.push('Substore index');
    console.log('     ✅ Substore index created');

    // 4. Index on lastUpdated
    console.log('   - Creating index on lastUpdated...');
    await collection.createIndex(
      { lastUpdated: 1 },
      { name: 'lastUpdated_index' }
    );
    indexResults.push('LastUpdated index');
    console.log('     ✅ LastUpdated index created');

    // 5. Index on isStale
    console.log('   - Creating index on isStale...');
    await collection.createIndex(
      { isStale: 1 },
      { name: 'isStale_index' }
    );
    indexResults.push('IsStale index');
    console.log('     ✅ IsStale index created');

    // 6. Compound index on lastUpdated + isStale
    console.log('   - Creating compound index on (lastUpdated, isStale)...');
    await collection.createIndex(
      { lastUpdated: 1, isStale: 1 },
      { name: 'lastUpdated_isStale_index' }
    );
    indexResults.push('Compound index (lastUpdated, isStale)');
    console.log('     ✅ Compound index created\n');

    // Verify indexes
    console.log('🔍 Verifying indexes...');
    const indexes = await collection.indexes();
    console.log(`✅ Total indexes created: ${indexes.length}\n`);
    
    console.log('📋 Index details:');
    const indexDetails = indexes.map((index, i) => {
      const detail = {
        name: index.name,
        keys: index.key,
        unique: index.unique || false
      };
      console.log(`   ${i + 1}. ${index.name}`);
      console.log(`      Keys: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log(`      Unique: true`);
      return detail;
    });
    console.log('');

    // Get collection stats
    const stats = await db.command({ collStats: collectionName });

    console.log('='.repeat(80));
    console.log('✅ COLLECTION PREPARED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`📊 Collection Stats:`);
    console.log(`   Database: GrowthAutomation`);
    console.log(`   Collection: ${collectionName}`);
    console.log(`   Document count: ${stats.count}`);
    console.log(`   Indexes: ${stats.nindexes}`);
    console.log(`   Storage size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    console.log('='.repeat(80) + '\n');

    return NextResponse.json({
      success: true,
      message: 'ProductCounts collection prepared successfully',
      details: {
        database: 'GrowthAutomation',
        collection: collectionName,
        indexesCreated: indexResults.length,
        indexes: indexDetails,
        stats: {
          documentCount: stats.count,
          indexCount: stats.nindexes,
          storageSize: `${(stats.storageSize / 1024).toFixed(2)} KB`
        }
      }
    });

  } catch (error: any) {
    console.error('\n❌ Error preparing collection:', error.message);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to prepare collection',
        error: error.message
      },
      { status: 500 }
    );
  }
}


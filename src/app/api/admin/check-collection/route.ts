/**
 * Check ProductCounts collection status
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // List all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Check if productcounts exists
    const hasProductCounts = collectionNames.includes('productcounts');
    
    let productCountsInfo = null;
    if (hasProductCounts) {
      const collection = db.collection('productcounts');
      const count = await collection.countDocuments();
      const sampleDocs = await collection.find().limit(3).toArray();
      const indexes = await collection.indexes();
      
      productCountsInfo = {
        exists: true,
        documentCount: count,
        indexCount: indexes.length,
        sampleDocuments: sampleDocs,
        indexes: indexes.map(idx => ({ name: idx.name, keys: idx.key }))
      };
    }

    return NextResponse.json({
      success: true,
      database: 'GrowthAutomation',
      collections: collectionNames,
      productcounts: productCountsInfo || { exists: false }
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}


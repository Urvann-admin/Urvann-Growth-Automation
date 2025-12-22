import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

// Use different MongoDB URIs based on environment
const uri = process.env.NODE_ENV === 'development' 
  ? process.env.MONGODB_URI_COPY 
  : process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const options = {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 30000, // 30 seconds
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db('GrowthAutomation');
}

export async function getCollection(collection: string) {
  const db = await getDb();
  return db.collection(collection);
}

// Mongoose connection for models
let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  if (!uri) {
    throw new Error('Please add your Mongo URI to .env.local');
  }

  try {
    // Connect to GrowthAutomation database explicitly
    await mongoose.connect(uri, {
      dbName: 'GrowthAutomation',
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
    });
    isConnected = true;
    console.log('MongoDB connected via Mongoose to GrowthAutomation database');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

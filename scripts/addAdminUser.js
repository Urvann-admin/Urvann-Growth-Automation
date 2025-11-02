const { MongoClient } = require('mongodb');
require('dotenv').config();

async function addAdminUser() {
  const uri = process.env.NODE_ENV === 'development' 
    ? process.env.MONGODB_URI_COPY 
    : process.env.MONGODB_URI;

  if (!uri) {
    console.error('MongoDB URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('GrowthAutomation');
    const collection = db.collection('users');

    // Check if admin user already exists
    const existingAdmin = await collection.findOne({ email: 'admin@urvann.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = {
      name: 'System Administrator',
      email: 'admin@urvann.com',
      password: 'admin123', // Plain text password
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(adminUser);
    console.log('Admin user created successfully:', result.insertedId);
    console.log('Login credentials:');
    console.log('Email: admin@urvann.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error adding admin user:', error);
  } finally {
    await client.close();
  }
}

addAdminUser();











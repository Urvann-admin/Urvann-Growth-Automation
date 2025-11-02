const { MongoClient } = require('mongodb');

// MongoDB connection
const uri = process.env.MONGODB_URI_COPY || process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function addUser() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('GrowthAutomation');
    const collection = db.collection('users');

    // User data to insert
    const user = {
      name: 'Test User',
      email: 'test@urvann.com',
      password: 'password123', // Plain text password as requested
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if user already exists
    const existingUser = await collection.findOne({ email: user.email });
    if (existingUser) {
      console.log('User already exists with email:', user.email);
      return;
    }

    // Insert the user
    const result = await collection.insertOne(user);
    console.log('User created successfully:', result.insertedId);
    console.log('Login credentials:');
    console.log('Email:', user.email);
    console.log('Password:', user.password);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

addUser();











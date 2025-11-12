import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

// Helper function to get collection from UrvannSellerApp database
async function getUsersCollection() {
  const client = await clientPromise;
  const db = client.db('UrvannSellerApp');
  return db.collection('users');
}

export class SaathiUsersModel {
  static async findByUsername(username) {
    const collection = await getUsersCollection();
    return collection.findOne({ username });
  }

  static async create(userData) {
    const collection = await getUsersCollection();
    
    const user = {
      username: userData.username,
      password: userData.password,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await collection.insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  static async findAll() {
    const collection = await getUsersCollection();
    return collection.find({}).sort({ createdAt: -1 }).toArray();
  }

  static async findById(id) {
    const collection = await getUsersCollection();
    return collection.findOne({ _id: new ObjectId(id) });
  }

  static async update(id, userData) {
    const collection = await getUsersCollection();
    
    const updateData = {
      ...userData,
      updatedAt: new Date(),
    };
    
    return collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
  }

  static async delete(id) {
    const collection = await getUsersCollection();
    return collection.deleteOne({ _id: new ObjectId(id) });
  }

  static async validatePassword(user, password) {
    // Compare plain text passwords
    return user.password === password;
  }
}


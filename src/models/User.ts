import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'team_member';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export class UserModel {
  static async findByEmail(email: string) {
    const collection = await getCollection('users');
    return collection.findOne({ email });
  }

  static async create(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>) {
    const collection = await getCollection('users');
    
    const user = {
      ...userData,
      password: userData.password, // Store password as plain text
      isActive: userData.isActive ?? true, // Default to active
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await collection.insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  static async validatePassword(user: User, password: string) {
    // Compare plain text passwords
    return user.password === password;
  }

  static async updateLastLogin(userId: ObjectId) {
    const collection = await getCollection('users');
    return collection.updateOne(
      { _id: userId },
      { $set: { lastLoginAt: new Date() } }
    );
  }

  static async findAll() {
    const collection = await getCollection('users');
    return collection.find({}).sort({ createdAt: -1 }).toArray();
  }

  static async findById(id: string) {
    const collection = await getCollection('users');
    return collection.findOne({ _id: new ObjectId(id) });
  }

  static async update(id: string, userData: Partial<Omit<User, '_id' | 'createdAt'>>) {
    const collection = await getCollection('users');
    
    const updateData = {
      ...userData,
      updatedAt: new Date(),
    };
    
    return collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
  }

  static async delete(id: string) {
    const collection = await getCollection('users');
    return collection.deleteOne({ _id: new ObjectId(id) });
  }

  static async findByRole(role: 'admin' | 'manager' | 'team_member') {
    const collection = await getCollection('users');
    return collection.find({ role }).toArray();
  }

  static async getActiveUsers() {
    const collection = await getCollection('users');
    return collection.find({ isActive: true }).sort({ createdAt: -1 }).toArray();
  }

  static async toggleUserStatus(id: string, isActive: boolean) {
    const collection = await getCollection('users');
    return collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive, updatedAt: new Date() } }
    );
  }
}

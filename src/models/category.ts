import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface Category {
  _id?: string;
  category: string;
  alias: string;
  typeOfCategory: string;
  l1Parent: string;
  l2Parent: string;
  l3Parent: string;
  publish: boolean;
  priorityOrder: number;
  substores?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class CategoryModel {
  static async findAll() {
    const collection = await getCollection('categoryList');
    return collection.find({}).toArray();
  }

  static async findById(id: string) {
    const collection = await getCollection('categoryList');
    return collection.findOne({ _id: id as any });
  }

  static async create(categoryData: Omit<Category, 'createdAt' | 'updatedAt'>) {
    const collection = await getCollection('categoryList');
    
    const category = {
      ...categoryData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await collection.insertOne(category as any);
    return { ...category, _id: categoryData._id };
  }

  static async update(id: string | ObjectId, categoryData: Partial<Omit<Category, '_id' | 'createdAt'>>) {
    const collection = await getCollection('categoryList');
    
    // Convert string ID to ObjectId if needed
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const updateData = {
      ...categoryData,
      updatedAt: new Date(),
    };
    
    return collection.updateOne(
      { _id: objectId },
      { $set: updateData }
    );
  }

  static async delete(id: string) {
    const collection = await getCollection('categoryList');
    return collection.deleteOne({ _id: id as any });
  }

  static async findByCategory(category: string) {
    const collection = await getCollection('categoryList');
    return collection.findOne({ category });
  }

  static async findByAlias(alias: string) {
    const collection = await getCollection('categoryList');
    return collection.findOne({ alias });
  }

  static async findByType(typeOfCategory: string) {
    const collection = await getCollection('categoryList');
    return collection.find({ typeOfCategory }).toArray();
  }

  static async findByParent(l1Parent?: string, l2Parent?: string, l3Parent?: string) {
    const collection = await getCollection('categoryList');
    const query: any = {};
    
    if (l1Parent) query.l1Parent = l1Parent;
    if (l2Parent) query.l2Parent = l2Parent;
    if (l3Parent) query.l3Parent = l3Parent;
    
    return collection.find(query).toArray();
  }

  static async findPublished() {
    const collection = await getCollection('categoryList');
    return collection.find({ 
      $or: [
        { publish: true },
        { publish: 1 }
      ]
    }).sort({ priorityOrder: 1 }).toArray();
  }

  static async updatePriorityOrder(id: string, priorityOrder: number) {
    const collection = await getCollection('categoryList');
    return collection.updateOne(
      { _id: id as any },
      { $set: { priorityOrder, updatedAt: new Date() } }
    );
  }
}

import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface Category {
  _id?: string | ObjectId;
  /** Custom id from uploads (file _id column), stored as string only */
  categoryId?: string;
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

  static async findById(id: string | ObjectId) {
    const collection = await getCollection('categoryList');
    // Try to convert string to ObjectId if it's a valid ObjectId string
    let queryId: ObjectId | string = id;
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      queryId = new ObjectId(id);
    }
    return collection.findOne({ _id: queryId as any });
  }

  static async create(categoryData: Omit<Category, 'createdAt' | 'updatedAt'>) {
    const collection = await getCollection('categoryList');
    const { _id: _ignoredId, ...rest } = categoryData as any;
    const category: any = {
      ...rest,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // categoryId from uploads is stored as string only; never use it as MongoDB _id
    if (category.categoryId != null) {
      category.categoryId = String(category.categoryId);
    }
    const result = await collection.insertOne(category);
    return { ...category, _id: result.insertedId };
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

  static async delete(id: string | ObjectId) {
    const collection = await getCollection('categoryList');
    let queryId: ObjectId | string = id;
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      queryId = new ObjectId(id);
    }
    return collection.deleteOne({ _id: queryId as any });
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

  static async updatePriorityOrder(id: string | ObjectId, priorityOrder: number) {
    const collection = await getCollection('categoryList');
    let queryId: ObjectId | string = id;
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      queryId = new ObjectId(id);
    }
    return collection.updateOne(
      { _id: queryId as any },
      { $set: { priorityOrder, updatedAt: new Date() } }
    );
  }
}

import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface SellerMaster {
  _id?: string | ObjectId;
  /** Name of the seller */
  seller_name: string;
  /** Unique identifier for the seller */
  seller_id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'sellerMaster';

export class SellerMasterModel {
  static async findAll(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find(query).toArray();
  }

  static async findById(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    let queryId: ObjectId | string = id;
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      queryId = new ObjectId(id);
    }
    return collection.findOne({ _id: queryId as any });
  }

  static async findBySellerId(sellerId: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.findOne({ seller_id: sellerId });
  }

  static async findBySellerName(sellerName: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.findOne({ seller_name: sellerName });
  }

  static async create(data: Omit<SellerMaster, '_id' | 'createdAt' | 'updatedAt'>) {
    const collection = await getCollection(COLLECTION_NAME);
    const document: any = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  static async update(id: string | ObjectId, data: Partial<Omit<SellerMaster, '_id' | 'createdAt'>>) {
    const collection = await getCollection(COLLECTION_NAME);
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    return collection.updateOne(
      { _id: objectId },
      { $set: updateData }
    );
  }

  static async delete(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    let queryId: ObjectId | string = id;
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      queryId = new ObjectId(id);
    }
    return collection.deleteOne({ _id: queryId as any });
  }
}

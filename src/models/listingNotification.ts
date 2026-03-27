import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export type ListingNotificationType = 'inventory_recalculated_unpublished';

export interface ListingNotification {
  _id?: string | ObjectId;
  type: ListingNotificationType;
  parentSkus: string[];
  childSkus: string[];
  /** listingProduct _id strings — preferred for publish; legacy notifications may omit */
  listingProductIds?: string[];
  message: string;
  read: boolean;
  createdAt?: Date;
}

const COLLECTION_NAME = 'listingNotification';

export class ListingNotificationModel {
  static async create(data: Omit<ListingNotification, '_id' | 'createdAt'>) {
    const collection = await getCollection(COLLECTION_NAME);
    const document = {
      ...data,
      createdAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  static async findUnread() {
    const collection = await getCollection(COLLECTION_NAME);
    return collection
      .find({ read: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
  }

  static async findById(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId = typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;
    return collection.findOne({ _id: queryId as any });
  }

  static async markAsRead(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return collection.updateOne(
      { _id: objectId },
      { $set: { read: true } }
    );
  }

  static async markAllAsRead() {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.updateMany(
      { read: false },
      { $set: { read: true } }
    );
  }
}

import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

/** How overhead is allocated across lines: Equal, Manual, quantity proportion, value proportion */
export type OverheadAllocationMethod = 'Equal' | 'Manual' | 'quantity' | 'value';

/** Overhead details for a purchase */
export interface PurchaseOverhead {
  /** Overhead amount (total for the bill) */
  overheadAmount?: number;
  /** Overhead nature */
  overheadNature?: string;
  /** Bill reference */
  bill?: string;
  /** Allocated amount (this line's share) */
  allocatedAmount?: number;
  /** How overhead was allocated across lines */
  allocationMethod?: OverheadAllocationMethod;
}

/** Type breakdown: Listing, Revival, Growth, Consumers */
export interface PurchaseTypeBreakdown {
  /** Listing (number) */
  listing?: number;
  /** Revival (number) */
  revival?: number;
  /** Growth (number) */
  growth?: number;
  /** Consumers (number) */
  consumers?: number;
}

export interface PurchaseMaster {
  _id?: string | ObjectId;
  /** Bill number */
  billNumber: string;
  /** Product code */
  productCode: string;
  /** Product name */
  productName?: string;
  /** Item type */
  itemType?: string;
  /** Quantity */
  quantity: number;
  /** Product price */
  productPrice: number;
  /** Overhead details */
  overhead?: PurchaseOverhead;
  /** Amount */
  amount: number;
  /** Type breakdown (Listing, Revival, Growth, Consumers) */
  type: PurchaseTypeBreakdown;
  /** Quantity of this purchase line's listing allocation that has been used in listings. Remaining = type.listing - listed_quantity */
  listed_quantity?: number;
  /** Parent SKU */
  parentSku: string;
  /** Procurement seller: MongoDB _id of procurement_seller_master (same as parent master seller field) */
  seller?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'purchaseMaster';

export class PurchaseMasterModel {
  static async findAll(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find(query).toArray();
  }

  static async findById(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId =
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;
    return collection.findOne({ _id: queryId as ObjectId });
  }

  static async create(
    data: Omit<PurchaseMaster, '_id' | 'createdAt' | 'updatedAt'>
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const document = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  static async createMany(
    dataArray: Omit<PurchaseMaster, '_id' | 'createdAt' | 'updatedAt'>[]
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const now = new Date();
    const documents = dataArray.map((data) => ({
      ...data,
      createdAt: now,
      updatedAt: now,
    }));
    const result = await collection.insertMany(documents);
    return { insertedCount: result.insertedCount, insertedIds: result.insertedIds };
  }

  static async update(
    id: string | ObjectId,
    data: Partial<Omit<PurchaseMaster, '_id' | 'createdAt'>>
  ) {
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
    const queryId =
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;
    return collection.deleteOne({ _id: queryId as ObjectId });
  }

  static async findWithPagination(
    query: Record<string, unknown> = {},
    page: number = 1,
    limit: number = 20,
    sortField: string = 'createdAt',
    sortOrder: 1 | -1 = -1
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      collection
        .find(query)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async count(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.countDocuments(query);
  }

  static async findByBillNumber(billNumber: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ billNumber }).toArray();
  }

  static async findByParentSku(parentSku: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ parentSku }).toArray();
  }
}

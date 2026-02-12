import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface ParentMaster {
  _id?: string | ObjectId;
  /** Plant name */
  plant: string;
  /** Other names for the plant */
  otherNames?: string;
  /** Variety of the plant */
  variety?: string;
  /** Colour of the plant */
  colour?: string;
  /** Height in feet */
  height?: number;
  /** Moss Stick type */
  mossStick?: string;
  /** Size in inches */
  size?: number;
  /** Type of the product */
  type?: string;
  /** Final name: plant + other names + variety + colour + in + size + inch + type */
  finalName?: string;
  /** Array of category IDs/names */
  categories: string[];
  /** Price of the product */
  price: number;
  /** Publish status */
  publish: string;
  /** Inventory quantity */
  inventoryQuantity: number;
  /** AWS S3 image URLs */
  images: string[];
  /** StoreHippo product ID (fetched from StoreHippo API after creation) */
  storeHippoId?: string;
  /** StoreHippo product _id - same as storeHippoId, canonical field for API mapping */
  product_id?: string;
  /** Seller ID from sellerMaster */
  seller?: string;
  /** Hub name (e.g. Whitefield, HSR) for inventory/listing scope */
  hub?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'parentMaster';

export class ParentMasterModel {
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

  static async findByPlant(plant: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.findOne({ plant });
  }

  static async create(data: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>) {
    const collection = await getCollection(COLLECTION_NAME);
    const document: any = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  static async createMany(dataArray: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>[]) {
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

  static async update(id: string | ObjectId, data: Partial<Omit<ParentMaster, '_id' | 'createdAt'>>) {
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

  static async deleteMany(ids: (string | ObjectId)[]) {
    const collection = await getCollection(COLLECTION_NAME);
    const objectIds = ids.map((id) => 
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id
    );
    return collection.deleteMany({ _id: { $in: objectIds as any[] } });
  }

  static async findByCategory(category: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ categories: category }).toArray();
  }

  static async findPublished() {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ publish: 'published' }).toArray();
  }

  static async search(searchTerm: string) {
    const collection = await getCollection(COLLECTION_NAME);
    const regex = new RegExp(searchTerm, 'i');
    return collection.find({
      $or: [
        { plant: regex },
        { otherNames: regex },
        { variety: regex },
        { type: regex },
      ],
    }).toArray();
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
}

import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

/** StoreHippo collection item (manual type) – stored in our DB as collectionMaster */
export interface CollectionMaster {
  _id?: string | ObjectId;
  /** StoreHippo collection _id */
  storeHippoId: string;
  name: string;
  type: string;
  alias: string;
  /** Dynamic rule groups from the app UI; may include fields not synced to StoreHippo. */
  filters?: unknown[];
  images?: unknown[];
  SEO?: Record<string, unknown>;
  publish?: number;
  metafields?: Record<string, unknown>;
  _size?: number;
  sort_order?: number;
  created_on?: string;
  _created_by?: string;
  entity_type?: string;
  description?: string;
  default_sort_order?: string;
  facet_group?: string;
  substore?: unknown[];
  updated_on?: string;
  _updated_by?: string;
  /** When we synced this record into our DB */
  syncedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'collectionMaster';

export class CollectionMasterModel {
  static async findAll(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find(query).toArray();
  }

  static async findById(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId =
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;
    return collection.findOne({ _id: queryId as any });
  }

  /** Collection `alias` values for StoreHippo `collections` (deduped, stable order). */
  static async findAliasesByIds(ids: (string | ObjectId)[]): Promise<string[]> {
    if (!ids.length) return [];
    const collection = await getCollection(COLLECTION_NAME);
    const oids = ids.map((id) => {
      if (typeof id === 'string' && ObjectId.isValid(id)) return new ObjectId(id);
      return id;
    });
    const docs = await collection
      .find({ _id: { $in: oids as any } }, { projection: { alias: 1 } })
      .toArray();
    const seen = new Set<string>();
    const out: string[] = [];
    for (const d of docs) {
      const a = String((d as { alias?: string }).alias ?? '').trim();
      if (a && !seen.has(a)) {
        seen.add(a);
        out.push(a);
      }
    }
    return out;
  }

  static async findByStoreHippoId(storeHippoId: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.findOne({ storeHippoId });
  }

  static async create(data: Omit<CollectionMaster, '_id' | 'createdAt' | 'updatedAt'>) {
    const collection = await getCollection(COLLECTION_NAME);
    const document: any = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  static async createMany(
    dataArray: Omit<CollectionMaster, '_id' | 'createdAt' | 'updatedAt'>[]
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
    data: Partial<Omit<CollectionMaster, '_id' | 'createdAt'>>
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId =
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    const result = await collection.updateOne(
      { _id: queryId as any },
      { $set: updateData }
    );
    return result;
  }

  static async upsertByStoreHippoId(
    storeHippoId: string,
    data: Omit<CollectionMaster, '_id' | 'createdAt' | 'updatedAt'>
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const now = new Date();
    const document = {
      ...data,
      storeHippoId,
      syncedAt: now,
      updatedAt: now,
    };
    const result = await collection.updateOne(
      { storeHippoId },
      { $set: document },
      { upsert: true }
    );
    return result;
  }

  static async delete(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId =
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;
    return collection.deleteOne({ _id: queryId as any });
  }

  static async deleteMany(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.deleteMany(query);
  }

  static async count(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.countDocuments(query);
  }

  static async findWithPagination(
    query: Record<string, unknown> = {},
    page: number = 1,
    limit: number = 20,
    sortField: string = 'sort_order',
    sortOrder: 1 | -1 = 1
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      collection
        .find(query)
        .sort({ [sortField]: sortOrder, name: 1 })
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
}

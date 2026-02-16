import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface ImageItem {
  /** S3 URL of the image */
  url: string;
  /** Original filename */
  filename: string;
  /** File size in bytes */
  size: number;
  /** Upload timestamp */
  uploadedAt: Date;
}

export interface ImageCollection {
  _id?: string | ObjectId;
  /** Collection name (optional, user-provided) */
  name?: string;
  /** Type of upload: 'zip' | 'folder' | 'files' */
  uploadType: 'zip' | 'folder' | 'files';
  /** Array of uploaded images with metadata */
  images: ImageItem[];
  /** Total size in bytes */
  totalSize: number;
  /** Number of images */
  imageCount: number;
  /** Upload status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  /** Error message if failed */
  errorMessage?: string;
  /** Warnings during upload */
  warnings?: string[];
  /** User who created this collection */
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'imageCollections';

export class ImageCollectionModel {
  /**
   * Find all image collections with optional query
   */
  static async findAll(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find(query).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Find collection by ID
   */
  static async findById(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId = typeof id === 'string' ? new ObjectId(id) : id;
    return collection.findOne({ _id: queryId as any });
  }

  /**
   * Create a new image collection
   */
  static async create(data: Omit<ImageCollection, '_id' | 'createdAt' | 'updatedAt'>) {
    const collection = await getCollection(COLLECTION_NAME);
    const document = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return { _id: result.insertedId, ...document };
  }

  /**
   * Update an existing image collection
   */
  static async updateById(id: string | ObjectId, data: Partial<ImageCollection>) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId = typeof id === 'string' ? new ObjectId(id) : id;
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    return collection.updateOne({ _id: queryId as any }, { $set: updateData });
  }

  /**
   * Delete image collection by ID
   */
  static async deleteById(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId = typeof id === 'string' ? new ObjectId(id) : id;
    return collection.deleteOne({ _id: queryId as any });
  }

  /**
   * Find collections with pagination
   */
  static async findWithPagination(
    query: Record<string, unknown> = {},
    page: number = 1,
    limit: number = 20
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Count collections matching query
   */
  static async count(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.countDocuments(query);
  }

  /**
   * Get statistics
   */
  static async getStats() {
    const collection = await getCollection(COLLECTION_NAME);
    const stats = await collection
      .aggregate([
        {
          $group: {
            _id: null,
            totalCollections: { $sum: 1 },
            totalImages: { $sum: '$imageCount' },
            totalSize: { $sum: '$totalSize' },
            avgImagesPerCollection: { $avg: '$imageCount' },
          },
        },
      ])
      .toArray();

    return stats[0] || {
      totalCollections: 0,
      totalImages: 0,
      totalSize: 0,
      avgImagesPerCollection: 0,
    };
  }
}

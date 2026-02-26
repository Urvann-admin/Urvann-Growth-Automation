import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface ImageItem {
  /** S3 URL of the image */
  url: string;
  /** Original filename */
  filename: string;
  /** File size in bytes */
  size?: number;
  /** MIME type */
  mimeType?: string;
  /** Upload timestamp */
  uploadedAt?: Date;
}

export interface UploadLogEntry {
  /** Log timestamp */
  timestamp: Date;
  /** Log level: 'info' | 'success' | 'warning' | 'error' */
  level: 'info' | 'success' | 'warning' | 'error';
  /** Log message */
  message: string;
  /** Additional context data */
  details?: Record<string, any>;
}

export interface ImageCollection {
  _id?: string | ObjectId;
  /** Collection name (optional, user-provided) */
  name?: string;
  /** Description of the collection */
  description?: string;
  /** Array of images with metadata */
  images: ImageItem[];
  /** Total number of images */
  imageCount: number;
  /** Total size of all images in bytes */
  totalSize?: number;
  /** Upload source: 'single' | 'multiple' | 'zip' | 'folder' | 'files' */
  source?: 'single' | 'multiple' | 'zip' | 'folder' | 'files';
  /** Upload logs for debugging and tracking */
  uploadLog?: UploadLogEntry[];
  /** User who created this collection */
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'imageCollections';

export class ImageCollectionModel {
  /**
   * Find all image collections with optional filtering
   */
  static async findAll(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find(query).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Find a single collection by ID
   */
  static async findById(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId = typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;
    
    return collection.findOne({ _id: queryId as any });
  }

  /**
   * Find collections by name (partial match)
   */
  static async findByName(name: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ 
      name: { $regex: name, $options: 'i' } 
    }).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Create a new image collection
   */
  static async create(data: Omit<ImageCollection, '_id' | 'createdAt' | 'updatedAt'>) {
    const collection = await getCollection(COLLECTION_NAME);
    
    const document = {
      ...data,
      imageCount: data.images.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  /**
   * Update an existing image collection
   */
  static async update(
    id: string | ObjectId,
    data: Partial<Omit<ImageCollection, '_id' | 'createdAt' | 'updatedAt'>>
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId = typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;

    const updateData = {
      ...data,
      ...(data.images && { imageCount: data.images.length }),
      updatedAt: new Date(),
    };

    const result = await collection.updateOne(
      { _id: queryId as any },
      { $set: updateData }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Delete a collection by ID
   */
  static async delete(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId = typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;
    
    return collection.deleteOne({ _id: queryId as any });
  }

  /**
   * Delete multiple collections
   */
  static async deleteMany(ids: (string | ObjectId)[]) {
    const collection = await getCollection(COLLECTION_NAME);
    const objectIds = ids.map(id => 
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id
    );
    
    return collection.deleteMany({ _id: { $in: objectIds as any[] } });
  }

  /**
   * Get collections with pagination
   */
  static async findWithPagination(
    query: Record<string, unknown> = {},
    page: number = 1,
    limit: number = 20
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
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

  /**
   * Count collections
   */
  static async count(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.countDocuments(query);
  }

  /**
   * Get collection statistics
   */
  static async getStats() {
    const collection = await getCollection(COLLECTION_NAME);
    
    const pipeline = [
      {
        $group: {
          _id: null,
          totalCollections: { $sum: 1 },
          totalImages: { $sum: '$imageCount' },
          totalSize: { $sum: '$totalSize' },
          avgImagesPerCollection: { $avg: '$imageCount' },
        }
      }
    ];

    const result = await collection.aggregate(pipeline).toArray();
    return result[0] || {
      totalCollections: 0,
      totalImages: 0,
      totalSize: 0,
      avgImagesPerCollection: 0,
    };
  }
}

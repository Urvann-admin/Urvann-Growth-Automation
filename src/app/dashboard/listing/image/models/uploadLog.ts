import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';
export type LogAction =
  | 'upload_started'
  | 'validation'
  | 'extraction'
  | 's3_upload'
  | 'db_save'
  | 'upload_completed'
  | 'upload_failed';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  action: LogAction;
  message: string;
  details?: Record<string, unknown>;
}

export interface UploadLog {
  _id?: string | ObjectId;
  /** Reference to image collection */
  collectionId?: string | ObjectId;
  /** Upload session ID for tracking */
  sessionId: string;
  /** Type of upload */
  uploadType: 'zip' | 'folder' | 'files';
  /** Collection name if provided */
  collectionName?: string;
  /** Status of the upload operation */
  status: 'started' | 'processing' | 'completed' | 'failed' | 'partial';
  /** Array of log entries */
  logs: LogEntry[];
  /** Summary statistics */
  summary: {
    totalFiles: number;
    successfulUploads: number;
    failedUploads: number;
    totalSize: number;
    duration?: number; // in milliseconds
  };
  /** User who initiated upload */
  userId?: string;
  /** IP address */
  ipAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'imageUploadLogs';

export class UploadLogModel {
  /**
   * Create a new upload log
   */
  static async create(data: Omit<UploadLog, '_id' | 'createdAt' | 'updatedAt'>) {
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
   * Add a log entry to an existing upload log
   */
  static async addLogEntry(
    sessionId: string,
    logEntry: Omit<LogEntry, 'timestamp'>
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const entry = {
      ...logEntry,
      timestamp: new Date(),
    };
    await collection.updateOne(
      { sessionId },
      {
        $push: { logs: entry },
        $set: { updatedAt: new Date() },
      } as Record<string, unknown>
    );
    return entry;
  }

  /**
   * Update upload log status and summary
   */
  static async updateLog(
    sessionId: string,
    data: {
      status?: UploadLog['status'];
      summary?: Partial<UploadLog['summary']>;
      collectionId?: string | ObjectId;
    }
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const updateData: any = { updatedAt: new Date() };

    if (data.status) updateData.status = data.status;
    if (data.collectionId) updateData.collectionId = data.collectionId;
    if (data.summary) {
      // Merge summary fields
      Object.keys(data.summary).forEach((key) => {
        updateData[`summary.${key}`] = data.summary![key as keyof typeof data.summary];
      });
    }

    return collection.updateOne({ sessionId }, { $set: updateData });
  }

  /**
   * Find log by session ID
   */
  static async findBySessionId(sessionId: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.findOne({ sessionId });
  }

  /**
   * Find logs by collection ID
   */
  static async findByCollectionId(collectionId: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId = typeof collectionId === 'string' ? new ObjectId(collectionId) : collectionId;
    return collection.find({ collectionId: queryId as any }).toArray();
  }

  /**
   * Find all logs with pagination
   */
  static async findWithPagination(
    query: Record<string, unknown> = {},
    page: number = 1,
    limit: number = 50
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
   * Delete logs older than specified days
   */
  static async deleteOldLogs(daysOld: number = 30) {
    const collection = await getCollection(COLLECTION_NAME);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await collection.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return result.deletedCount;
  }

  /**
   * Get log statistics
   */
  static async getStats(dateRange?: { start: Date; end: Date }) {
    const collection = await getCollection(COLLECTION_NAME);
    const matchQuery: any = {};

    if (dateRange) {
      matchQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const stats = await collection
      .aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalFiles: { $sum: '$summary.totalFiles' },
            successfulUploads: { $sum: '$summary.successfulUploads' },
            failedUploads: { $sum: '$summary.failedUploads' },
            totalSize: { $sum: '$summary.totalSize' },
            avgDuration: { $avg: '$summary.duration' },
          },
        },
      ])
      .toArray();

    return stats;
  }
}

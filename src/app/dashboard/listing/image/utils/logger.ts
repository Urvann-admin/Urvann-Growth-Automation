import {
  UploadLogModel,
  type LogLevel,
  type LogAction,
  type UploadLog,
} from '../models/uploadLog';

export class UploadLogger {
  private sessionId: string;
  private startTime: number;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
  }

  /**
   * Initialize a new upload log
   */
  async initialize(
    uploadType: 'zip' | 'folder' | 'files',
    collectionName?: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    await UploadLogModel.create({
      sessionId: this.sessionId,
      uploadType,
      collectionName,
      status: 'started',
      logs: [
        {
          timestamp: new Date(),
          level: 'info',
          action: 'upload_started',
          message: `Upload session started: ${uploadType}${collectionName ? ` - ${collectionName}` : ''}`,
          details: {
            uploadType,
            collectionName,
            userId,
            ipAddress,
          },
        },
      ],
      summary: {
        totalFiles: 0,
        successfulUploads: 0,
        failedUploads: 0,
        totalSize: 0,
      },
      userId,
      ipAddress,
    });
  }

  /**
   * Log an info message
   */
  async info(action: LogAction, message: string, details?: Record<string, unknown>): Promise<void> {
    await this.log('info', action, message, details);
  }

  /**
   * Log a success message
   */
  async success(
    action: LogAction,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log('success', action, message, details);
  }

  /**
   * Log a warning message
   */
  async warning(
    action: LogAction,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log('warning', action, message, details);
  }

  /**
   * Log an error message
   */
  async error(action: LogAction, message: string, details?: Record<string, unknown>): Promise<void> {
    await this.log('error', action, message, details);
  }

  /**
   * Add a log entry
   */
  private async log(
    level: LogLevel,
    action: LogAction,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await UploadLogModel.addLogEntry(this.sessionId, {
      level,
      action,
      message,
      details,
    });

    // Also log to console for debugging
    const logMethod = level === 'error' ? console.error : console.log;
    logMethod(
      `[${level.toUpperCase()}] [${action}] ${message}`,
      details ? details : ''
    );
  }

  /**
   * Update the upload status
   */
  async updateStatus(status: UploadLog['status']): Promise<void> {
    await UploadLogModel.updateLog(this.sessionId, { status });
  }

  /**
   * Update the summary statistics
   */
  async updateSummary(summary: Partial<UploadLog['summary']>): Promise<void> {
    await UploadLogModel.updateLog(this.sessionId, { summary });
  }

  /**
   * Set the collection ID reference
   */
  async setCollectionId(collectionId: string): Promise<void> {
    await UploadLogModel.updateLog(this.sessionId, { collectionId });
  }

  /**
   * Complete the upload log with final summary
   */
  async complete(
    status: 'completed' | 'failed' | 'partial',
    summary: {
      totalFiles: number;
      successfulUploads: number;
      failedUploads: number;
      totalSize: number;
    },
    collectionId?: string
  ): Promise<void> {
    const duration = Date.now() - this.startTime;

    await UploadLogModel.updateLog(this.sessionId, {
      status,
      summary: { ...summary, duration },
      ...(collectionId && { collectionId }),
    });

    const message =
      status === 'completed'
        ? `✓ Upload completed successfully: ${summary.successfulUploads}/${summary.totalFiles} files uploaded`
        : status === 'partial'
          ? `⚠ Upload completed with errors: ${summary.successfulUploads}/${summary.totalFiles} files uploaded, ${summary.failedUploads} failed`
          : `✗ Upload failed: ${summary.failedUploads}/${summary.totalFiles} files failed`;

    await this.log(
      status === 'completed' ? 'success' : status === 'partial' ? 'warning' : 'error',
      'upload_completed',
      message,
      {
        duration,
        summary,
        collectionId,
      }
    );
  }

  /**
   * Get the session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * Create a new upload logger
 */
export function createUploadLogger(sessionId: string): UploadLogger {
  return new UploadLogger(sessionId);
}

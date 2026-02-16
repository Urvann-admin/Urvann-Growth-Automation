import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Credentials from .env.local: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME
const region = process.env.AWS_REGION || 'ap-south-1';
const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'urvann-growth-parent-images';

const CREDENTIALS_HELP =
  'Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to .env.local and restart the dev server.';

function getPublicUrl(key: string): string {
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}

function checkCredentials(): string | null {
  const id = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!id || !secret) {
    return `AWS credentials not set. ${CREDENTIALS_HELP}`;
  }
  return null;
}

export interface BufferUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  size?: number;
}

/**
 * Upload a buffer to S3 - useful for ZIP extracted files
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  filename: string,
  folder: string = 'image-collections',
  contentType: string = 'image/jpeg'
): Promise<BufferUploadResult> {
  try {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = filename.split('.').pop() || 'jpg';
    const sanitizedName = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);
    const key = `${folder}/${timestamp}-${randomString}-${sanitizedName}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return {
      success: true,
      url: getPublicUrl(key),
      size: buffer.length,
    };
  } catch (error: unknown) {
    console.error('S3 buffer upload error:', error);
    let message =
      error instanceof Error
        ? error.message
        : typeof (error as { message?: string })?.message === 'string'
          ? (error as { message: string }).message
          : 'Unknown error occurred';
    if (
      message.includes('Access Key') ||
      message.includes('credential') ||
      message.includes('AKID') ||
      message.includes('authorization header is malformed')
    ) {
      message = `AWS credentials missing or invalid. ${CREDENTIALS_HELP}`;
    }
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Upload multiple buffers to S3 in parallel with batch processing
 */
export async function uploadMultipleBuffersToS3(
  files: Array<{ buffer: Buffer; filename: string; contentType: string }>,
  folder: string = 'image-collections',
  batchSize: number = 15
): Promise<{
  success: boolean;
  results: Array<{ filename: string; url?: string; error?: string; size?: number }>;
  successCount: number;
  errorCount: number;
}> {
  const credError = checkCredentials();
  if (credError) {
    return {
      success: false,
      results: files.map((f) => ({ filename: f.filename, error: credError })),
      successCount: 0,
      errorCount: files.length,
    };
  }

  const results: Array<{
    filename: string;
    url?: string;
    error?: string;
    size?: number;
  }> = [];

  // Process in batches to avoid overwhelming S3
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((file) =>
        uploadBufferToS3(file.buffer, file.filename, folder, file.contentType)
      )
    );

    batchResults.forEach((result, index) => {
      const file = batch[index];
      if (result.status === 'fulfilled' && result.value.success) {
        results.push({
          filename: file.filename,
          url: result.value.url,
          size: result.value.size,
        });
      } else {
        const error =
          result.status === 'rejected'
            ? result.reason
            : result.value.error || 'Unknown error';
        results.push({
          filename: file.filename,
          error: String(error),
        });
      }
    });
  }

  const successCount = results.filter((r) => r.url).length;
  const errorCount = results.filter((r) => r.error).length;

  return {
    success: successCount > 0,
    results,
    successCount,
    errorCount,
  };
}

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'ap-south-1';
const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'urvann-growth-parent-images';

function getPublicUrl(key: string): string {
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}

export interface S3UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadImageToS3(file: File, folder: string = 'products'): Promise<S3UploadResult> {
  try {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const key = `${folder}/${timestamp}-${randomString}.${fileExtension}`;

    const buffer = await file.arrayBuffer();

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: new Uint8Array(buffer),
        ContentType: file.type,
      })
    );

    return {
      success: true,
      url: getPublicUrl(key),
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function uploadMultipleImagesToS3(files: File[], folder: string = 'products'): Promise<{
  success: boolean;
  urls: string[];
  errors: string[];
}> {
  const results = await Promise.allSettled(
    files.map((file) => uploadImageToS3(file, folder))
  );

  const urls: string[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success && result.value.url) {
      urls.push(result.value.url);
    } else {
      const error =
        result.status === 'rejected' ? result.reason : result.value.error || 'Unknown error';
      errors.push(`File ${files[index].name}: ${error}`);
    }
  });

  return {
    success: urls.length > 0,
    urls,
    errors,
  };
}

export async function deleteImageFromS3(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(imageUrl);
    const key = url.pathname.substring(1);

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );

    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function deleteMultipleImagesFromS3(imageUrls: string[]): Promise<{
  success: boolean;
  deletedCount: number;
  errors: string[];
}> {
  const results = await Promise.allSettled(imageUrls.map((url) => deleteImageFromS3(url)));

  let deletedCount = 0;
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      deletedCount++;
    } else {
      const error =
        result.status === 'rejected'
          ? String(result.reason)
          : result.value.error || 'Unknown error';
      errors.push(`URL ${imageUrls[index]}: ${error}`);
    }
  });

  return {
    success: deletedCount > 0,
    deletedCount,
    errors,
  };
}

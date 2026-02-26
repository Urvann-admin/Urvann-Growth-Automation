import { NextRequest, NextResponse } from 'next/server';
import { ImageCollectionModel } from '@/app/dashboard/listing/image/models/imageCollection';
import { uploadMultipleBuffersToS3 } from '@/app/dashboard/listing/image/utils/s3BufferUpload';
import {
  validateFileExtension,
  validateFileSize,
  validateImageCount,
  validateCollectionSize,
  generateSessionId,
  getContentTypeFromFilename,
} from '@/app/dashboard/listing/image/utils/validation';
import { createUploadLogger } from '@/app/dashboard/listing/image/utils/logger';

export const maxDuration = 300; // 5 minutes for large uploads

export async function POST(request: NextRequest) {
  const sessionId = generateSessionId();
  const logger = createUploadLogger(sessionId);
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const collectionName = formData.get('name') as string | null;
    const uploadType = (formData.get('uploadType') as 'folder' | 'files') || 'files';

    // Initialize logging
    await logger.initialize(
      uploadType,
      collectionName || undefined,
      undefined,
      request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined
    );

    // Extract files from FormData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'images' && value instanceof File) {
        files.push(value);
      }
    }

    await logger.info('validation', `Received ${files.length} files for upload`);

    if (files.length === 0) {
      await logger.error('validation', 'No images provided in request');
      return NextResponse.json(
        {
          success: false,
          message: 'No images provided',
          sessionId,
        },
        { status: 400 }
      );
    }

    // Validate image count
    const countValidation = validateImageCount(files.length);
    if (!countValidation.valid) {
      await logger.error('validation', countValidation.error || 'Invalid image count');
      return NextResponse.json(
        {
          success: false,
          message: countValidation.error,
          sessionId,
        },
        { status: 400 }
      );
    }

    // Validate each file
    const validationErrors: Array<{ filename: string; error: string }> = [];
    const validFiles: Array<{ file: File; buffer: Buffer }> = [];
    let totalSize = 0;

    await logger.info('validation', 'Validating individual files...');

    for (const file of files) {
      // Validate extension
      const extValidation = validateFileExtension(file.name);
      if (!extValidation.valid) {
        validationErrors.push({ filename: file.name, error: extValidation.error! });
        continue;
      }

      // Validate size
      const sizeValidation = validateFileSize(file.size);
      if (!sizeValidation.valid) {
        validationErrors.push({ filename: file.name, error: sizeValidation.error! });
        continue;
      }

      // Convert to buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      validFiles.push({ file, buffer });
      totalSize += file.size;
    }

    await logger.info('validation', 'File validation completed', {
      validFiles: validFiles.length,
      invalidFiles: validationErrors.length,
      totalSize,
    });

    if (validationErrors.length > 0) {
      await logger.warning(
        'validation',
        `${validationErrors.length} files failed validation`,
        { errors: validationErrors }
      );
    }

    if (validFiles.length === 0) {
      await logger.error('validation', 'No valid images found');
      return NextResponse.json(
        {
          success: false,
          message: 'No valid images found',
          errors: validationErrors,
          sessionId,
        },
        { status: 400 }
      );
    }

    // Validate total size
    const sizeValidation = validateCollectionSize(totalSize);
    if (!sizeValidation.valid) {
      await logger.error('validation', sizeValidation.error || 'Collection too large');
      return NextResponse.json(
        {
          success: false,
          message: sizeValidation.error,
          sessionId,
        },
        { status: 400 }
      );
    }

    await logger.success('validation', 'All validations passed');

    // Update status to processing
    await logger.updateStatus('processing');

    // Prepare files for S3 upload
    const filesToUpload = validFiles.map(({ file, buffer }) => ({
      buffer,
      filename: file.name,
      contentType: getContentTypeFromFilename(file.name),
    }));

    // Upload to S3
    await logger.info('s3_upload', `Uploading ${filesToUpload.length} images to S3...`);
    const uploadResult = await uploadMultipleBuffersToS3(
      filesToUpload,
      `image-collections/${sessionId}`,
      15 // batch size
    );

    await logger.info('s3_upload', 'S3 upload completed', {
      successCount: uploadResult.successCount,
      errorCount: uploadResult.errorCount,
    });

    if (uploadResult.errorCount > 0) {
      await logger.warning(
        's3_upload',
        `${uploadResult.errorCount} files failed to upload to S3`,
        { errors: uploadResult.results.filter((r) => r.error) }
      );
    }

    if (uploadResult.successCount === 0) {
      const errorDetails = uploadResult.results.filter((r) => r.error);
      const firstError = errorDetails[0]?.error;
      await logger.error('s3_upload', 'All S3 uploads failed', { errors: errorDetails });
      await logger.complete(
        'failed',
        {
          totalFiles: validFiles.length,
          successfulUploads: 0,
          failedUploads: validFiles.length,
          totalSize,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message: firstError || 'Failed to upload images to S3',
          errors: errorDetails,
          sessionId,
        },
        { status: 500 }
      );
    }

    // Create image collection document
    await logger.info('db_save', 'Saving collection metadata to database...');
    
    const successfulUploads = uploadResult.results.filter((r) => r.url);
    const images = successfulUploads.map((result) => ({
      url: result.url!,
      filename: result.filename,
      size: result.size!,
      uploadedAt: new Date(),
    }));

    const allWarnings = [
      ...validationErrors.map((e) => `${e.filename}: ${e.error}`),
      ...uploadResult.results.filter((r) => r.error).map((r) => `${r.filename}: ${r.error}`),
    ];

    const collection = await ImageCollectionModel.create({
      name: collectionName || undefined,
      uploadType,
      images,
      totalSize: images.reduce((sum, img) => sum + img.size, 0),
      imageCount: images.length,
      status: allWarnings.length > 0 ? 'partial' : 'completed',
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    });

    await logger.setCollectionId(collection._id!.toString());
    await logger.success('db_save', 'Collection saved successfully', {
      collectionId: collection._id,
      imageCount: images.length,
    });

    // Complete the upload log
    const finalStatus = allWarnings.length > 0 ? 'partial' : 'completed';
    await logger.complete(
      finalStatus,
      {
        totalFiles: files.length,
        successfulUploads: uploadResult.successCount,
        failedUploads: validationErrors.length + uploadResult.errorCount,
        totalSize: collection.totalSize,
      },
      collection._id!.toString()
    );

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadResult.successCount} out of ${files.length} images`,
      data: {
        collectionId: collection._id,
        collectionName: collection.name,
        imageCount: images.length,
        totalSize: collection.totalSize,
        urls: images.map((img) => img.url),
        duration,
        sessionId,
      },
      ...(allWarnings.length > 0 && {
        warnings: allWarnings,
        partialSuccess: true,
      }),
    });

  } catch (error) {
    console.error('[upload-files] Error:', error);
    
    await logger.error(
      'upload_failed',
      error instanceof Error ? error.message : 'Unknown error occurred',
      { error: String(error) }
    );

    await logger.complete(
      'failed',
      {
        totalFiles: 0,
        successfulUploads: 0,
        failedUploads: 0,
        totalSize: 0,
      }
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process file upload',
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
      },
      { status: 500 }
    );
  }
}

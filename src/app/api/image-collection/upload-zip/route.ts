import { NextRequest, NextResponse } from 'next/server';
import { ImageCollectionModel } from '@/app/dashboard/listing/image/models/imageCollection';
import { extractImagesFromZip, validateZipFile } from '@/app/dashboard/listing/image/utils/zipExtractor';
import { uploadMultipleBuffersToS3 } from '@/app/dashboard/listing/image/utils/s3BufferUpload';
import {
  validateImageCount,
  validateCollectionSize,
  generateSessionId,
} from '@/app/dashboard/listing/image/utils/validation';
import { createUploadLogger } from '@/app/dashboard/listing/image/utils/logger';

export const maxDuration = 300; // 5 minutes for large ZIP files

export async function POST(request: NextRequest) {
  const sessionId = generateSessionId();
  const logger = createUploadLogger(sessionId);
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const zipFile = formData.get('zip') as File;
    const collectionName = formData.get('name') as string | null;

    // Initialize logging
    await logger.initialize(
      'zip',
      collectionName || undefined,
      undefined,
      request.headers.get('x-forwarded-for') || request.ip || undefined
    );

    // Validate ZIP file presence
    if (!zipFile || !(zipFile instanceof File)) {
      await logger.error('validation', 'No ZIP file provided in request');
      return NextResponse.json(
        {
          success: false,
          message: 'No ZIP file provided',
          sessionId,
        },
        { status: 400 }
      );
    }

    await logger.info('validation', `Validating ZIP file: ${zipFile.name}`, {
      fileName: zipFile.name,
      fileSize: zipFile.size,
    });

    // Validate ZIP file
    const zipValidation = validateZipFile(zipFile);
    if (!zipValidation.valid) {
      await logger.error('validation', `ZIP validation failed: ${zipValidation.error}`);
      return NextResponse.json(
        {
          success: false,
          message: zipValidation.error,
          sessionId,
        },
        { status: 400 }
      );
    }

    await logger.success('validation', 'ZIP file validation passed');

    // Extract images from ZIP
    await logger.info('extraction', 'Extracting images from ZIP archive...');
    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    const extractionResult = await extractImagesFromZip(zipBuffer);

    await logger.info('extraction', 'Extraction completed', {
      filesExtracted: extractionResult.files.length,
      skippedFiles: extractionResult.skippedFiles.length,
      errors: extractionResult.errors.length,
      totalSize: extractionResult.totalSize,
    });

    if (!extractionResult.success || extractionResult.files.length === 0) {
      await logger.error(
        'extraction',
        'No valid images found in ZIP',
        { errors: extractionResult.errors }
      );
      return NextResponse.json(
        {
          success: false,
          message: 'No valid images found in ZIP archive',
          errors: extractionResult.errors,
          sessionId,
        },
        { status: 400 }
      );
    }

    // Log skipped and error files
    if (extractionResult.skippedFiles.length > 0) {
      await logger.warning(
        'extraction',
        `Skipped ${extractionResult.skippedFiles.length} non-image files`,
        { skippedFiles: extractionResult.skippedFiles }
      );
    }

    if (extractionResult.errors.length > 0) {
      await logger.warning(
        'extraction',
        `${extractionResult.errors.length} files had errors`,
        { errors: extractionResult.errors }
      );
    }

    // Validate image count
    const countValidation = validateImageCount(extractionResult.files.length);
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

    // Validate total size
    const sizeValidation = validateCollectionSize(extractionResult.totalSize);
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

    await logger.success('validation', 'Image count and size validation passed');

    // Update status to processing
    await logger.updateStatus('processing');

    // Upload to S3
    await logger.info('s3_upload', `Uploading ${extractionResult.files.length} images to S3...`);
    const uploadResult = await uploadMultipleBuffersToS3(
      extractionResult.files,
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
          totalFiles: extractionResult.files.length,
          successfulUploads: 0,
          failedUploads: extractionResult.files.length,
          totalSize: extractionResult.totalSize,
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

    const collection = await ImageCollectionModel.create({
      name: collectionName || undefined,
      uploadType: 'zip',
      images,
      totalSize: images.reduce((sum, img) => sum + img.size, 0),
      imageCount: images.length,
      status: uploadResult.errorCount > 0 ? 'partial' : 'completed',
      warnings: uploadResult.errorCount > 0 
        ? uploadResult.results.filter((r) => r.error).map((r) => `${r.filename}: ${r.error}`)
        : undefined,
    });

    await logger.setCollectionId(collection._id!.toString());
    await logger.success('db_save', 'Collection saved successfully', {
      collectionId: collection._id,
      imageCount: images.length,
    });

    // Complete the upload log
    const finalStatus = uploadResult.errorCount > 0 ? 'partial' : 'completed';
    await logger.complete(
      finalStatus,
      {
        totalFiles: extractionResult.files.length,
        successfulUploads: uploadResult.successCount,
        failedUploads: uploadResult.errorCount,
        totalSize: collection.totalSize,
      },
      collection._id!.toString()
    );

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadResult.successCount} out of ${extractionResult.files.length} images`,
      data: {
        collectionId: collection._id,
        collectionName: collection.name,
        imageCount: images.length,
        totalSize: collection.totalSize,
        urls: images.map((img) => img.url),
        duration,
        sessionId,
      },
      ...(uploadResult.errorCount > 0 && {
        warnings: uploadResult.results.filter((r) => r.error),
        partialSuccess: true,
      }),
    });

  } catch (error) {
    console.error('[upload-zip] Error:', error);
    
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
        message: 'Failed to process ZIP upload',
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
      },
      { status: 500 }
    );
  }
}

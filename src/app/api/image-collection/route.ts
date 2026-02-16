import { NextRequest, NextResponse } from 'next/server';
import { ImageCollectionModel } from '@/app/dashboard/listing/image/models/imageCollection';
import { deleteMultipleImagesFromS3 } from '@/lib/s3Upload';

/**
 * GET /api/image-collection
 * List all image collections with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const uploadType = searchParams.get('uploadType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (uploadType) query.uploadType = uploadType;
    if (dateFrom || dateTo) {
      query.createdAt = {} as Record<string, Date>;
      if (dateFrom) (query.createdAt as Record<string, Date>).$gte = new Date(dateFrom + 'T00:00:00.000Z');
      if (dateTo) (query.createdAt as Record<string, Date>).$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const result = await ImageCollectionModel.findWithPagination(query, page, limit);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('[image-collection] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to list collections',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/image-collection
 * Delete a collection by ID: removes all images from S3, then deletes the document from MongoDB.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Collection ID required' },
        { status: 400 }
      );
    }

    // Fetch collection to get S3 URLs
    const collection = await ImageCollectionModel.findById(id);
    if (!collection) {
      return NextResponse.json(
        { success: false, message: 'Collection not found' },
        { status: 404 }
      );
    }

    const urls = collection.images?.map((img: { url: string }) => img.url).filter(Boolean) ?? [];

    // Delete all images from S3 first
    if (urls.length > 0) {
      const s3Result = await deleteMultipleImagesFromS3(urls);
      if (s3Result.errors.length > 0) {
        console.warn('[image-collection] DELETE S3 had errors:', s3Result.errors);
        // Continue to delete from MongoDB even if some S3 deletes failed
      }
    }

    // Delete the collection from MongoDB
    const result = await ImageCollectionModel.deleteById(id);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Collection not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Collection and its images deleted successfully',
      deletedFromS3: urls.length,
    });
  } catch (error) {
    console.error('[image-collection] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete collection',
      },
      { status: 500 }
    );
  }
}

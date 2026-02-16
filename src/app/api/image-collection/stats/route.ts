import { NextRequest, NextResponse } from 'next/server';
import { ImageCollectionModel } from '@/app/dashboard/listing/image/models/imageCollection';

/**
 * GET /api/image-collection/stats
 * Get statistics for image collections
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await ImageCollectionModel.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[image-collection/stats] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get stats',
      },
      { status: 500 }
    );
  }
}

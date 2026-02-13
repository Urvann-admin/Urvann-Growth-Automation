import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CollectionMasterModel } from '@/models/collectionMaster';

/**
 * GET /api/collection-master
 * List collections from our collectionMaster DB (after sync).
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim() || '';

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { alias: new RegExp(search, 'i') },
      ];
    }

    const result = await CollectionMasterModel.findWithPagination(
      query,
      page,
      limit,
      'sort_order',
      1
    );

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('[collection-master] GET error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to list collections' },
      { status: 500 }
    );
  }
}

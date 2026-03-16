import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CollectionMasterModel } from '@/models/collectionMaster';
import { slug } from '@/lib/utils';

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

/**
 * POST /api/collection-master
 * Create a new collection (manual). Body: { name, publish?, description? }.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'name is required' },
        { status: 400 }
      );
    }
    const publish =
      body.publish !== undefined && body.publish !== null
        ? Number(body.publish)
        : 0;
    const description =
      typeof body.description === 'string' ? body.description.trim() || undefined : undefined;

    const storeHippoId = `manual-${crypto.randomUUID()}`;
    const alias = slug(name);

    const document = {
      storeHippoId,
      name,
      type: 'manual',
      alias,
      publish: Number.isFinite(publish) ? publish : 0,
      ...(description !== undefined && { description }),
    };

    const created = await CollectionMasterModel.create(document as any);
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('[collection-master] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to create collection',
      },
      { status: 500 }
    );
  }
}

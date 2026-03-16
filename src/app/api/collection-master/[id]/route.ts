import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CollectionMasterModel } from '@/models/collectionMaster';
import { slug } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Collection ID is required' },
        { status: 400 }
      );
    }

    const collection = await CollectionMasterModel.findById(id);

    if (!collection) {
      return NextResponse.json(
        { success: false, message: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: collection });
  } catch (error) {
    console.error('[collection-master] GET by id error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to fetch collection',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Collection ID is required' },
        { status: 400 }
      );
    }

    const existing = await CollectionMasterModel.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Collection not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { success: false, message: 'name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name;
      if (
        (existing as { storeHippoId?: string }).storeHippoId?.startsWith(
          'manual-'
        )
      ) {
        updateData.alias = slug(name);
      }
    }
    if (body.publish !== undefined && body.publish !== null) {
      const publish = Number(body.publish);
      updateData.publish = Number.isFinite(publish) ? publish : 0;
    }
    if (typeof body.description === 'string') {
      updateData.description =
        body.description.trim() || undefined;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, data: existing });
    }

    await CollectionMasterModel.update(id, updateData as any);
    const updated = await CollectionMasterModel.findById(id);
    return NextResponse.json({
      success: true,
      message: 'Collection updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('[collection-master] PATCH by id error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to update collection',
      },
      { status: 500 }
    );
  }
}

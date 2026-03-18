import { NextRequest, NextResponse } from 'next/server';
import { ImageCollectionModel } from '@/app/dashboard/listing/image/models/imageCollection';
import { UploadLogModel } from '@/app/dashboard/listing/image/models/uploadLog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Collection ID required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const excludeListed = searchParams.get('excludeListed') === 'true';

    const collection = await ImageCollectionModel.findById(id);

    if (!collection) {
      return NextResponse.json(
        { success: false, message: 'Collection not found' },
        { status: 404 }
      );
    }

    let data = collection;
    if (excludeListed && collection.images?.length) {
      const filteredImages = collection.images.filter(
        (img: { isListed?: boolean }) => !img.isListed
      );
      data = {
        ...collection,
        images: filteredImages,
        imageCount: filteredImages.length,
      };
    }

    // Optionally get associated logs
    const logs = await UploadLogModel.findByCollectionId(id);

    return NextResponse.json({
      success: true,
      data,
      logs: logs.length > 0 ? logs : undefined,
    });
  } catch (error) {
    console.error('[image-collection/id] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get collection',
      },
      { status: 500 }
    );
  }
}

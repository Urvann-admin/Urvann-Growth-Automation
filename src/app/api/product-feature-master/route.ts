import { NextRequest, NextResponse } from 'next/server';
import { ProductFeatureMasterModel } from '@/models/productFeatureMaster';

/**
 * List product features for dropdowns (Parent Master, listing screen, edit parent).
 */
export async function GET() {
  try {
    const items = await ProductFeatureMasterModel.findAllSorted();
    const data = items.map((doc) => ({
      _id: doc._id != null ? String(doc._id) : undefined,
      name: doc.name,
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[product-feature-master] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch features',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ListingProductModel } from '@/models/listingProduct';
import type { ListingSection } from '@/models/listingProduct';

const SECTIONS = new Set<ListingSection>(['listing', 'revival', 'growth', 'consumer']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') as ListingSection | null;
    if (!section || !SECTIONS.has(section)) {
      return NextResponse.json(
        { success: false, message: 'Valid section query param is required' },
        { status: 400 }
      );
    }

    const urls = await ListingProductModel.listImageUrlsFromListedOrPublished(section);
    return NextResponse.json({ success: true, urls });
  } catch (error) {
    console.error('[listed-image-urls] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load listed image URLs' },
      { status: 500 }
    );
  }
}

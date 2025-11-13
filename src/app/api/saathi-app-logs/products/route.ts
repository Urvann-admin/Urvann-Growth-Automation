import { NextResponse } from 'next/server';
import { ProductInventoryModel } from '@/models/productInventory';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seller = searchParams.get('seller');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || undefined;
    const updatedBy = searchParams.get('updatedBy') || undefined;

    if (!seller) {
      return NextResponse.json(
        { success: false, message: 'Seller parameter is required' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;
    
    // Sorting and filtering is now done at database level in findBySeller method
    const [products, totalCount] = await Promise.all([
      ProductInventoryModel.findBySeller(seller, skip, limit, search, updatedBy),
      ProductInventoryModel.countBySellerFilter(seller, search, updatedBy),
    ]);

    const hasMore = skip + products.length < totalCount;

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore,
        loaded: skip + products.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products', error: error.message },
      { status: 500 }
    );
  }
}


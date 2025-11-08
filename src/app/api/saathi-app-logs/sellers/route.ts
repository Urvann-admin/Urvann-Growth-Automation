import { NextResponse } from 'next/server';
import { ProductInventoryModel } from '@/models/productInventory';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    
    const skip = (page - 1) * limit;
    
    const [sellers, totalCount] = await Promise.all([
      ProductInventoryModel.getAllSellers(skip, limit),
      ProductInventoryModel.getSellersCount(),
    ]);
    
    const hasMore = skip + sellers.length < totalCount;
    
    return NextResponse.json({
      success: true,
      data: sellers,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore,
        loaded: skip + sellers.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sellers', error: error.message },
      { status: 500 }
    );
  }
}

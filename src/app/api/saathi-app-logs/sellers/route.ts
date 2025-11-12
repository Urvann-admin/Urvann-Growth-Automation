import { NextResponse } from 'next/server';
import { ProductInventoryModel } from '@/models/productInventory';
import { SaathiUsersModel } from '@/models/saathiUsers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    
    // Get all users to filter sellers
    const users = await SaathiUsersModel.findAll();
    const validUsernames = new Set(users.map(user => user.username));
    
    // If no users exist, return empty result
    if (validUsernames.size === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          hasMore: false,
          loaded: 0,
        },
      });
    }
    
    // Get all sellers (we'll filter and paginate after)
    // Get a larger batch to account for filtering
    const allSellers = await ProductInventoryModel.getAllSellers(0, 10000);
    
    // Filter sellers to only include those with accounts in users collection
    const filteredSellers = allSellers.filter(seller => 
      validUsernames.has(seller.seller)
    );
    
    // Apply pagination to filtered results
    const skip = (page - 1) * limit;
    const paginatedSellers = filteredSellers.slice(skip, skip + limit);
    const totalCount = filteredSellers.length;
    const hasMore = skip + paginatedSellers.length < totalCount;
    
    return NextResponse.json({
      success: true,
      data: paginatedSellers,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore,
        loaded: skip + paginatedSellers.length,
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

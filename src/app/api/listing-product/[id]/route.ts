import { NextRequest, NextResponse } from 'next/server';
import { ListingProductModel, withDerivedParentSkus, type ListingProduct } from '@/models/listingProduct';
import { syncListingProductToSkuMasterNew } from '@/models/skuMasterNew';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }

    const listingProduct = await ListingProductModel.findById(id);
    
    if (!listingProduct) {
      return NextResponse.json(
        { success: false, message: 'Listing product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: withDerivedParentSkus(listingProduct as ListingProduct),
    });
  } catch (error) {
    console.error('Error fetching listing product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch listing product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }

    // Get existing product
    const existing = await ListingProductModel.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Listing product not found' },
        { status: 404 }
      );
    }

    // For individual updates, we'll use a simplified validation
    const sanitized = sanitizeIndividualUpdateData(body);

    const result = await ListingProductModel.update(id, sanitized);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Listing product not found' },
        { status: 404 }
      );
    }

    // Sync to Inventory_Master.Sku_Master_New (refetch full document first)
    const updated = await ListingProductModel.findById(id);
    if (updated) {
      await syncListingProductToSkuMasterNew(updated as ListingProduct);
    }

    return NextResponse.json({
      success: true,
      message: 'Listing product updated successfully',
    });
  } catch (error) {
    console.error('Error updating listing product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update listing product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }

    const result = await ListingProductModel.delete(id);
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Listing product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Listing product deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting listing product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete listing product' },
      { status: 500 }
    );
  }
}

// Simplified sanitization for individual updates
function sanitizeIndividualUpdateData(data: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};

  // Allow direct updates to most fields
  const allowedFields = [
    'plant', 'otherNames', 'variety', 'colour', 'height', 'mossStick', 
    'size', 'type', 'description', 'status', 'seller', 'hub', 'images',
    'categories', 'collectionIds'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'images' || field === 'categories' || field === 'collectionIds') {
        // Handle arrays
        if (Array.isArray(data[field])) {
          sanitized[field] = (data[field] as unknown[]).map(item => String(item).trim()).filter(Boolean);
        }
      } else if (field === 'height' || field === 'size') {
        // Handle numbers
        sanitized[field] = typeof data[field] === 'number' ? data[field] : parseFloat(String(data[field])) || undefined;
      } else if (field === 'status') {
        // Validate status
        if (['draft', 'listed', 'published'].includes(data[field] as string)) {
          sanitized[field] = data[field];
        }
      } else {
        // Handle strings
        sanitized[field] = String(data[field]).trim();
      }
    }
  }

  return sanitized;
}
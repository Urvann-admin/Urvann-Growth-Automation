import { NextRequest, NextResponse } from 'next/server';
import { ParentMasterModel } from '@/models/parentMaster';
import { ProcurementSellerMasterModel } from '@/models/procurementSellerMaster';
import { deleteMultipleImagesFromS3 } from '@/lib/s3Upload';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    const product = await ParentMasterModel.findById(id);
    
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch product' },
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
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    const updateData = { ...body } as Record<string, unknown>;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.compare_price;
    delete updateData.sort_order;
    delete updateData.publish;
    delete updateData.inventoryQuantity;
    delete updateData.inventory_management;
    delete updateData.inventory_management_level;
    delete updateData.inventory_allow_out_of_stock;

    const existing = await ParentMasterModel.findById(id);
    const updatingSeller = updateData.seller !== undefined;
    const updatingPrice = updateData.price !== undefined;
    if (updatingSeller || updatingPrice) {
      const sellerId = (updateData.seller ?? existing?.seller) != null ? String(updateData.seller ?? existing?.seller).trim() : null;
      const priceVal = updateData.price != null ? Number(updateData.price) : (existing && 'price' in existing ? Number(existing.price) : null);
      if (sellerId && priceVal != null && !isNaN(priceVal)) {
        const procurementSeller = await ProcurementSellerMasterModel.findById(sellerId);
        const factor = procurementSeller?.multiplicationFactor ?? 1;
        updateData.listing_price = priceVal * factor;
      }
    }

    const result = await ParentMasterModel.update(id, updateData);
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Fetch the updated product
    const updated = await ParentMasterModel.findById(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Product updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product' },
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
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    const product = await ParentMasterModel.findById(id);
    
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    const errors: string[] = [];

    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      console.log(`[Delete] Deleting ${product.images.length} images from S3`);
      const s3Result = await deleteMultipleImagesFromS3(product.images);
      if (!s3Result.success || s3Result.errors.length > 0) {
        console.warn(`[Delete] S3 deletion had errors:`, s3Result.errors);
        errors.push(...s3Result.errors.map(e => `S3: ${e}`));
      } else {
        console.log(`[Delete] Successfully deleted ${s3Result.deletedCount} images from S3`);
      }
    }

    const result = await ParentMasterModel.delete(id);
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Product not found in database' },
        { status: 404 }
      );
    }

    console.log(`[Delete] Product deleted from database: ${id}`);

    return NextResponse.json({ 
      success: true, 
      message: errors.length > 0 
        ? `Product deleted with warnings: ${errors.join('; ')}` 
        : 'Product deleted successfully',
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

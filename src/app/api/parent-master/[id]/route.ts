import { NextRequest, NextResponse } from 'next/server';
import { ParentMasterModel } from '@/models/parentMaster';
import { deleteProductFromStoreHippo } from '@/lib/storeHippoProducts';
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

    // Remove _id from update data if present
    const { _id, createdAt, ...updateData } = body;
    
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

    if (product.storeHippoId) {
      console.log(`[Delete] Deleting from StoreHippo: ${product.storeHippoId}`);
      const storeHippoResult = await deleteProductFromStoreHippo(product.storeHippoId);
      if (!storeHippoResult.success) {
        console.warn(`[Delete] StoreHippo deletion failed: ${storeHippoResult.error}`);
        errors.push(`StoreHippo: ${storeHippoResult.error}`);
      }
    }

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
        : 'Product deleted successfully from all systems',
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

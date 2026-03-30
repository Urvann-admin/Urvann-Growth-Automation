import { NextRequest, NextResponse } from 'next/server';
import { ParentMasterModel, isBaseParent, type ParentMaster } from '@/models/parentMaster';
import { ProcurementSellerMasterModel } from '@/models/procurementSellerMaster';
import { SellerMasterModel } from '@/models/sellerMaster';
import { deleteMultipleImagesFromS3 } from '@/lib/s3Upload';
import { serializeParent, sanitizeParentMasterUpdate } from '../route';

function isMongoObjectIdString(s: string): boolean {
  return /^[a-f\d]{24}$/i.test(String(s).trim());
}

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

    return NextResponse.json({ success: true, data: serializeParent(product as ParentMaster) });
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

    const raw = { ...body } as Record<string, unknown>;
    delete raw._id;
    delete raw.createdAt;
    delete raw.compare_price;
    delete raw.sort_order;
    delete raw.publish;
    delete raw.inventoryQuantity;
    delete raw.inventory_management;
    delete raw.inventory_management_level;
    delete raw.inventory_allow_out_of_stock;

    let updateData = sanitizeParentMasterUpdate(raw);

    if (updateData.productCode !== undefined) {
      const pcTrim = String(updateData.productCode).trim();
      const other = await ParentMasterModel.findByProductCode(pcTrim);
      if (other && String(other._id) !== String(id)) {
        return NextResponse.json(
          { success: false, message: 'A product with this product code already exists' },
          { status: 409 }
        );
      }
      updateData = { ...updateData, productCode: pcTrim || undefined };
    }

    if (updateData.sku !== undefined) {
      const skuTrim = String(updateData.sku).trim();
      const doc = await ParentMasterModel.findById(id);
      const resolved = skuTrim ? await ParentMasterModel.findBySku(skuTrim) : null;
      if (doc && isBaseParent(doc)) {
        if (resolved && isBaseParent(resolved) && String(resolved._id) !== String(id)) {
          return NextResponse.json(
            { success: false, message: 'A base parent with this SKU already exists' },
            { status: 409 }
          );
        }
      } else if (doc && skuTrim && !isBaseParent(doc)) {
        if (!resolved || !isBaseParent(resolved)) {
          return NextResponse.json(
            {
              success: false,
              message: 'sku must be the SKU of an existing base (parent) product',
            },
            { status: 400 }
          );
        }
      }
      updateData = { ...updateData, sku: skuTrim };
    }

    if (updateData.parentSku !== undefined && updateData.parentSku) {
      const linked = await ParentMasterModel.findBySku(String(updateData.parentSku).trim());
      if (!linked || !isBaseParent(linked)) {
        return NextResponse.json(
          { success: false, message: 'parentSku must be the SKU of an existing base (parent) product' },
          { status: 400 }
        );
      }
    }

    const existing = await ParentMasterModel.findById(id);
    const hubAfter =
      updateData.hub !== undefined && updateData.hub !== null && String(updateData.hub).trim()
        ? String(updateData.hub).trim()
        : existing && (existing as ParentMaster).hub
          ? String((existing as ParentMaster).hub).trim()
          : '';
    if (existing && isBaseParent(existing as ParentMaster) && hubAfter) {
      const sid = await SellerMasterModel.resolveStorefrontSellerIdForHub(hubAfter);
      if (sid) {
        updateData = { ...updateData, seller: sid };
      }
    }

    const updatingVendor =
      updateData.vendor_id !== undefined || updateData.seller !== undefined;
    const updatingPrice = updateData.sellingPrice !== undefined || updateData.price !== undefined;
    if (updatingVendor || updatingPrice) {
      const rawV = updateData.vendor_id != null ? String(updateData.vendor_id).trim() : '';
      const exV =
        existing && (existing as ParentMaster).vendor_id
          ? String((existing as ParentMaster).vendor_id).trim()
          : '';
      const exS = existing?.seller != null ? String(existing.seller).trim() : '';
      const legacyProc = !exV && isMongoObjectIdString(exS) ? exS : '';
      const fromBodySeller =
        updateData.seller != null && isMongoObjectIdString(String(updateData.seller))
          ? String(updateData.seller).trim()
          : '';
      const vendorKey = rawV || exV || legacyProc || fromBodySeller;
      const priceVal =
        updateData.sellingPrice != null
          ? Number(updateData.sellingPrice)
          : updateData.price != null
            ? Number(updateData.price)
            : existing && 'sellingPrice' in existing
              ? Number((existing as ParentMaster).sellingPrice)
              : existing && 'price' in existing
                ? Number((existing as ParentMaster).price)
                : null;
      if (vendorKey && priceVal != null && !isNaN(priceVal)) {
        const procurementSeller = await ProcurementSellerMasterModel.findById(vendorKey);
        const factor = procurementSeller?.multiplicationFactor ?? 1;
        updateData = { ...updateData, listing_price: priceVal * factor };
      }
    }

    const result = await ParentMasterModel.update(id, updateData);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    const updated = await ParentMasterModel.findById(id);
    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: serializeParent(updated as ParentMaster),
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

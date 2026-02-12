import { NextRequest, NextResponse } from 'next/server';
import { ParentMasterModel } from '@/models/parentMaster';
import type { ParentMaster } from '@/models/parentMaster';
import { syncProductToStoreHippo } from '@/lib/storeHippoProducts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const publish = searchParams.get('publish') || '';
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build query
    const query: Record<string, unknown> = {};
    
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { plant: regex },
        { otherNames: regex },
        { variety: regex },
        { type: regex },
      ];
    }
    
    if (category) {
      query.categories = category;
    }
    
    if (publish) {
      query.publish = publish;
    }

    const result = await ParentMasterModel.findWithPagination(
      query,
      page,
      limit,
      sortField,
      sortOrder as 1 | -1
    );

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching parent master products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle bulk create
    if (Array.isArray(body)) {
      const validatedItems: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>[] = [];
      
      for (const item of body) {
        const validated = validateParentMasterData(item);
        if (!validated.success) {
          return NextResponse.json(
            { success: false, message: validated.message },
            { status: 400 }
          );
        }
        validatedItems.push(validated.data!);
      }
      
      const result = await ParentMasterModel.createMany(validatedItems);
      return NextResponse.json({
        success: true,
        message: `Created ${result.insertedCount} products`,
        insertedCount: result.insertedCount,
      });
    }
    
    // Single create
    const validated = validateParentMasterData(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.message },
        { status: 400 }
      );
    }

    let created = await ParentMasterModel.create(validated.data!);
    
    // Sync to StoreHippo after successful MongoDB save
    const storeHippoResult = await syncProductToStoreHippo(validated.data!);
    
    if (!storeHippoResult.success) {
      // Log StoreHippo sync failure but don't fail the entire request
      console.error('StoreHippo sync failed for product:', validated.data!.plant, storeHippoResult.error);
      
      return NextResponse.json({ 
        success: true, 
        data: created,
        warning: `Product created locally but StoreHippo sync failed: ${storeHippoResult.error}`
      });
    }

    // Update with StoreHippo product_id if sync was successful
    if (storeHippoResult.storeHippoId && created._id) {
      const productId = storeHippoResult.storeHippoId;
      console.log(`[API] Updating product ${created._id} with product_id: ${productId}`);
      await ParentMasterModel.update(created._id, {
        product_id: productId,
        storeHippoId: productId,
      } as any);
      created = { ...created, product_id: productId, storeHippoId: productId } as typeof created;
      console.log(`[API] ✅ Product updated with product_id: ${productId}`);
    }

    console.log('Product successfully synced to StoreHippo:', storeHippoResult.storeHippoId);
    return NextResponse.json({ 
      success: true, 
      data: created,
      storeHippoSync: true
    });
  } catch (error) {
    console.error('Error creating parent master product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create product' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { _id, ...updateData } = body;
    
    if (!_id) {
      return NextResponse.json(
        { success: false, message: '_id is required for update' },
        { status: 400 }
      );
    }

    // Validate the update data (partial validation)
    const sanitized = sanitizeUpdateData(updateData);
    
    const result = await ParentMasterModel.update(_id, sanitized);
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating parent master product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');
    
    // Bulk delete
    if (ids) {
      const idArray = ids.split(',').filter(Boolean);
      if (idArray.length === 0) {
        return NextResponse.json(
          { success: false, message: 'No valid IDs provided' },
          { status: 400 }
        );
      }
      
      const result = await ParentMasterModel.deleteMany(idArray);
      return NextResponse.json({
        success: true,
        message: `Deleted ${result.deletedCount} products`,
        deletedCount: result.deletedCount,
      });
    }
    
    // Single delete
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id is required for deletion' },
        { status: 400 }
      );
    }

    const result = await ParentMasterModel.delete(id);
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting parent master product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

// Validation helper
function validateParentMasterData(data: unknown): {
  success: boolean;
  message?: string;
  data?: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>;
} {
  if (!data || typeof data !== 'object') {
    return { success: false, message: 'Invalid data format' };
  }

  const d = data as Record<string, unknown>;

  // Required fields
  if (!d.plant || typeof d.plant !== 'string' || !String(d.plant).trim()) {
    return { success: false, message: 'plant is required and must be a non-empty string' };
  }

  if (d.price === undefined || d.price === null || typeof d.price !== 'number' || d.price < 0) {
    return { success: false, message: 'price is required and must be a non-negative number' };
  }

  if (!d.publish || typeof d.publish !== 'string') {
    return { success: false, message: 'publish is required and must be a string' };
  }

  if (d.inventoryQuantity === undefined || typeof d.inventoryQuantity !== 'number' || d.inventoryQuantity < 0) {
    return { success: false, message: 'inventoryQuantity is required and must be a non-negative number' };
  }

  // Categories must be an array
  if (!Array.isArray(d.categories)) {
    return { success: false, message: 'categories must be an array' };
  }

  // Images must be an array
  if (!Array.isArray(d.images)) {
    return { success: false, message: 'images must be an array' };
  }

  // Build validated object
  const validated: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'> = {
    plant: String(d.plant).trim(),
    otherNames: d.otherNames ? String(d.otherNames).trim() : undefined,
    variety: d.variety ? String(d.variety).trim() : undefined,
    colour: d.colour ? String(d.colour).trim() : undefined,
    height: typeof d.height === 'number' ? d.height : undefined,
    mossStick: d.mossStick ? String(d.mossStick).trim() : undefined,
    size: typeof d.size === 'number' ? d.size : undefined,
    type: d.type ? String(d.type).trim() : undefined,
    seller: d.seller ? String(d.seller).trim() : undefined,
    finalName: d.finalName ? String(d.finalName).trim() : undefined,
    categories: (d.categories as unknown[]).map((c) => String(c).trim()).filter(Boolean),
    price: Number(d.price),
    publish: String(d.publish).trim(),
    inventoryQuantity: Number(d.inventoryQuantity),
    images: (d.images as unknown[]).map((img) => String(img).trim()).filter(Boolean),
    hub: d.hub ? String(d.hub).trim() : undefined,
  };

  return { success: true, data: validated };
}

// Sanitize update data (allows partial updates)
function sanitizeUpdateData(data: Record<string, unknown>): Partial<Omit<ParentMaster, '_id' | 'createdAt'>> {
  const sanitized: Partial<Omit<ParentMaster, '_id' | 'createdAt'>> = {};

  if (data.plant !== undefined) {
    sanitized.plant = String(data.plant).trim();
  }
  if (data.otherNames !== undefined) {
    sanitized.otherNames = String(data.otherNames).trim();
  }
  if (data.variety !== undefined) {
    sanitized.variety = String(data.variety).trim();
  }
  if (data.colour !== undefined) {
    sanitized.colour = String(data.colour).trim();
  }
  if (data.height !== undefined) {
    sanitized.height = typeof data.height === 'number' ? data.height : parseFloat(String(data.height)) || undefined;
  }
  if (data.mossStick !== undefined) {
    sanitized.mossStick = String(data.mossStick).trim();
  }
  if (data.size !== undefined) {
    sanitized.size = typeof data.size === 'number' ? data.size : parseFloat(String(data.size)) || undefined;
  }
  if (data.type !== undefined) {
    sanitized.type = String(data.type).trim();
  }
  if (data.finalName !== undefined) {
    sanitized.finalName = String(data.finalName).trim();
  }
  if (data.seller !== undefined) {
    sanitized.seller = String(data.seller).trim();
  }
  if (data.categories !== undefined && Array.isArray(data.categories)) {
    sanitized.categories = (data.categories as unknown[]).map((c) => String(c).trim()).filter(Boolean);
  }
  if (data.price !== undefined) {
    sanitized.price = typeof data.price === 'number' ? data.price : parseFloat(String(data.price)) || 0;
  }
  if (data.publish !== undefined) {
    sanitized.publish = String(data.publish).trim();
  }
  if (data.inventoryQuantity !== undefined) {
    sanitized.inventoryQuantity = typeof data.inventoryQuantity === 'number' ? data.inventoryQuantity : parseInt(String(data.inventoryQuantity), 10) || 0;
  }
  if (data.images !== undefined && Array.isArray(data.images)) {
    sanitized.images = (data.images as unknown[]).map((img) => String(img).trim()).filter(Boolean);
  }
  if (data.product_id !== undefined) {
    sanitized.product_id = String(data.product_id).trim();
  }
  if (data.hub !== undefined) {
    sanitized.hub = String(data.hub).trim() || undefined;
  }

  return sanitized;
}

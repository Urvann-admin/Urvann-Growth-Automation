import { NextRequest, NextResponse } from 'next/server';
import { ParentMasterModel } from '@/models/parentMaster';
import type { ParentMaster } from '@/models/parentMaster';
import { syncProductToStoreHippo } from '@/lib/storeHippoProducts';
import { getSubstoresByHub } from '@/shared/constants/hubs';
import { generateParentSKU } from '@/lib/skuGenerator';

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

    let sku: string | undefined;
    if (validated.data!.hub && validated.data!.plant) {
      try {
        // generateParentSKU calls getNextCounter and increments the hub counter (preview does not)
        sku = await generateParentSKU(validated.data!.hub, validated.data!.plant);
        console.log(`Generated SKU: ${sku} for hub: ${validated.data!.hub}, product: ${validated.data!.plant}`);
      } catch (error) {
        console.error('SKU generation failed:', error);
        return NextResponse.json(
          { success: false, message: `SKU generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 422 }
        );
      }
    }

    const dataWithSku = {
      ...validated.data!,
      ...(sku && { sku }),
    };

    // Sync to StoreHippo first – do not save to DB if StoreHippo fails
    const storeHippoResult = await syncProductToStoreHippo(dataWithSku);

    if (!storeHippoResult.success) {
      console.error('StoreHippo sync failed for product:', validated.data!.plant, storeHippoResult.error);
      return NextResponse.json(
        { success: false, message: `StoreHippo sync failed: ${storeHippoResult.error}` },
        { status: 422 }
      );
    }

    const productId = storeHippoResult.storeHippoId;
    const dataToSave = {
      ...dataWithSku,
      ...(productId && { product_id: productId, storeHippoId: productId }),
    };

    const created = await ParentMasterModel.create(dataToSave);

    console.log('Product saved to DB and synced to StoreHippo:', productId);
    return NextResponse.json({
      success: true,
      data: created,
      storeHippoSync: true,
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

  const hub = d.hub ? String(d.hub).trim() : undefined;
  const substores = hub ? getSubstoresByHub(hub) : [];

  const priceNum = Number(d.price);
  const comparePriceNum =
    d.compare_price != null && d.compare_price !== '' ? Number(d.compare_price) : null;
  if (
    comparePriceNum != null &&
    comparePriceNum > 0 &&
    priceNum > 0 &&
    comparePriceNum < priceNum
  ) {
    return {
      success: false,
      message: 'Compare price must be greater than or equal to Price (original price ≥ sale price).',
    };
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
    description: d.description ? String(d.description).trim() : undefined,
    finalName: d.finalName ? String(d.finalName).trim() : undefined,
    categories: (d.categories as unknown[]).map((c) => String(c).trim()).filter(Boolean),
    price: Number(d.price),
    compare_price: d.compare_price != null && d.compare_price !== '' ? Number(d.compare_price) : undefined,
    sort_order: d.sort_order != null && d.sort_order !== '' ? Number(d.sort_order) : undefined,
    publish: String(d.publish).trim(),
    inventoryQuantity: Number(d.inventoryQuantity),
    inventory_management: d.inventory_management ? String(d.inventory_management).trim() : undefined,
    inventory_management_level: d.inventory_management_level ? String(d.inventory_management_level).trim() : undefined,
    inventory_allow_out_of_stock: d.inventory_allow_out_of_stock != null && d.inventory_allow_out_of_stock !== '' ? Number(d.inventory_allow_out_of_stock) : undefined,
    images: (d.images as unknown[]).map((img) => String(img).trim()).filter(Boolean),
    hub: hub || undefined,
    substores: substores.length > 0 ? substores : undefined,
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
  if (data.description !== undefined) {
    sanitized.description = String(data.description).trim();
  }
  if (data.categories !== undefined && Array.isArray(data.categories)) {
    sanitized.categories = (data.categories as unknown[]).map((c) => String(c).trim()).filter(Boolean);
  }
  if (data.price !== undefined) {
    sanitized.price = typeof data.price === 'number' ? data.price : parseFloat(String(data.price)) || 0;
  }
  if (data.compare_price !== undefined) {
    sanitized.compare_price = typeof data.compare_price === 'number' ? data.compare_price : parseFloat(String(data.compare_price)) || undefined;
  }
  if (data.sort_order !== undefined) {
    sanitized.sort_order = typeof data.sort_order === 'number' ? data.sort_order : parseInt(String(data.sort_order), 10) || undefined;
  }
  if (data.inventory_management !== undefined) {
    sanitized.inventory_management = String(data.inventory_management).trim() || undefined;
  }
  if (data.inventory_management_level !== undefined) {
    sanitized.inventory_management_level = String(data.inventory_management_level).trim() || undefined;
  }
  if (data.inventory_allow_out_of_stock !== undefined && data.inventory_allow_out_of_stock !== '') {
    sanitized.inventory_allow_out_of_stock = typeof data.inventory_allow_out_of_stock === 'number'
      ? data.inventory_allow_out_of_stock
      : parseInt(String(data.inventory_allow_out_of_stock), 10) || 0;
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
    const hub = String(data.hub).trim() || undefined;
    sanitized.hub = hub;
    sanitized.substores = hub ? getSubstoresByHub(hub) : [];
  }
  if (data.substores !== undefined && Array.isArray(data.substores)) {
    sanitized.substores = (data.substores as unknown[]).map((s) => String(s).trim()).filter(Boolean);
  }
  if (data.sku !== undefined) {
    sanitized.sku = String(data.sku).trim();
  }

  return sanitized;
}

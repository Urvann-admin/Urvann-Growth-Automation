import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ListingProductModel } from '@/models/listingProduct';
import type { ListingProduct, ListingSection, ListingStatus } from '@/models/listingProduct';
import { ParentMasterModel } from '@/models/parentMaster';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { CategoryModel } from '@/models/category';
import { generateSKU } from '@/lib/skuGenerator';
import { getSubstoresByHub } from '@/shared/constants/hubs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const section = searchParams.get('section') as ListingSection | null;
    const status = searchParams.get('status') as ListingStatus | null;
    const category = searchParams.get('category') || '';
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
        { finalName: regex },
      ];
    }
    
    if (section) {
      query.section = section;
    }

    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.categories = category;
    }

    const result = await ListingProductModel.findWithPagination(
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
    console.error('Error fetching listing products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch listing products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle bulk create
    if (Array.isArray(body)) {
      const validatedItems: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>[] = [];
      
      for (const item of body) {
        const validated = await validateListingProductData(item);
        if (!validated.success) {
          return NextResponse.json(
            { success: false, message: validated.message },
            { status: 400 }
          );
        }
        validatedItems.push(validated.data!);
      }
      
      const result = await ListingProductModel.createMany(validatedItems);
      
      // Update parent quantities after successful creation
      await updateParentQuantitiesAfterCreation(validatedItems);
      
      return NextResponse.json({
        success: true,
        message: `Created ${result.insertedCount} listing products`,
        insertedCount: result.insertedCount,
      });
    }
    
    // Single create
    const validated = await validateListingProductData(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.message },
        { status: 400 }
      );
    }

    const created = await ListingProductModel.create(validated.data!);
    
    // Update parent quantities after successful creation
    await updateParentQuantitiesAfterCreation([validated.data!]);

    console.log('Listing product saved to DB:', created._id);
    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error('Error creating listing product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create listing product' },
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

    // Get existing product for quantity comparison
    const existing = await ListingProductModel.findById(_id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Listing product not found' },
        { status: 404 }
      );
    }

    // Validate the update data (partial validation)
    const sanitized = await sanitizeUpdateData(updateData, existing);
    if (!sanitized.success) {
      return NextResponse.json(
        { success: false, message: sanitized.message },
        { status: 400 }
      );
    }

    const result = await ListingProductModel.update(_id, sanitized.data!);
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Listing product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Listing product updated successfully' });
  } catch (error) {
    console.error('Error updating listing product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update listing product' },
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
      
      const result = await ListingProductModel.deleteMany(idArray);
      return NextResponse.json({
        success: true,
        message: `Deleted ${result.deletedCount} listing products`,
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

    const result = await ListingProductModel.delete(id);
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Listing product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Listing product deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete listing product' },
      { status: 500 }
    );
  }
}

// Validation helper
async function validateListingProductData(data: unknown): Promise<{
  success: boolean;
  message?: string;
  data?: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>;
}> {
  if (!data || typeof data !== 'object') {
    return { success: false, message: 'Invalid data format' };
  }

  const d = data as Record<string, unknown>;

  // Required fields
  if (!Array.isArray(d.parentSkus) || d.parentSkus.length === 0) {
    return { success: false, message: 'parentSkus is required and must be a non-empty array' };
  }

  if (!d.plant || typeof d.plant !== 'string' || !String(d.plant).trim()) {
    return { success: false, message: 'plant is required and must be a non-empty string' };
  }

  if (d.quantity === undefined || d.quantity === null || typeof d.quantity !== 'number' || d.quantity <= 0) {
    return { success: false, message: 'quantity is required and must be a positive number' };
  }

  if (!d.section || !['listing', 'revival', 'growth', 'consumer'].includes(d.section as string)) {
    return { success: false, message: 'section is required and must be one of: listing, revival, growth, consumer' };
  }

  // Categories must be an array
  if (!Array.isArray(d.categories)) {
    return { success: false, message: 'categories must be an array' };
  }

  // Images must be an array
  if (!Array.isArray(d.images)) {
    return { success: false, message: 'images must be an array' };
  }

  // Validate parent SKUs exist and have sufficient quantities
  const parentSkus = (d.parentSkus as string[]).map(sku => String(sku).trim()).filter(Boolean);
  const parents = await Promise.all(parentSkus.map(sku => ParentMasterModel.findBySku(sku)));
  
  for (let i = 0; i < parents.length; i++) {
    const parent = parents[i];
    if (!parent) {
      return { success: false, message: `Parent with SKU ${parentSkus[i]} not found` };
    }
    
    const availableQuantity = parent.typeBreakdown?.[d.section as ListingSection] || 0;
    if (availableQuantity < (d.quantity as number)) {
      return { success: false, message: `Insufficient quantity for parent ${parentSkus[i]}. Available: ${availableQuantity}, Required: ${d.quantity}` };
    }
  }

  // Calculate price and inventory_quantity
  let totalPrice = 0;
  let minInventoryQuantity = Infinity;
  const combinedCategories = new Set<string>();
  const combinedCollectionIds = new Set<string>();

  for (const parent of parents) {
    if (parent) {
      totalPrice += (parent.price || 0) * (d.quantity as number);
      
      const availableQuantity = parent.typeBreakdown?.[d.section as ListingSection] || 0;
      const inventoryForThisParent = Math.floor(availableQuantity / (d.quantity as number));
      minInventoryQuantity = Math.min(minInventoryQuantity, inventoryForThisParent);
      
      // Combine categories
      if (parent.categories) {
        parent.categories.forEach(cat => combinedCategories.add(cat));
      }
      
      // Combine collection IDs
      if (parent.collectionIds) {
        parent.collectionIds.forEach(id => combinedCollectionIds.add(String(id)));
      }
    }
  }

  // Apply category rules to get additional categories
  const autoCategories = await getAutoCategoriesForProduct({
    plant: String(d.plant).trim(),
    variety: d.variety ? String(d.variety).trim() : undefined,
    colour: d.colour ? String(d.colour).trim() : undefined,
    height: typeof d.height === 'number' ? d.height : undefined,
    size: typeof d.size === 'number' ? d.size : undefined,
    type: d.type ? String(d.type).trim() : undefined,
  });

  autoCategories.forEach(cat => combinedCategories.add(cat));

  // Generate SKU if not provided
  let sku: string | undefined;
  if (d.hub && d.plant && d.quantity) {
    try {
      sku = await generateSKU(String(d.hub).trim(), String(d.plant).trim(), Number(d.quantity));
    } catch (error) {
      console.error('SKU generation failed:', error);
      return { success: false, message: `SKU generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  const hub = d.hub ? String(d.hub).trim() : undefined;
  const substores = hub ? getSubstoresByHub(hub) : [];

  // Build validated object
  const validated: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'> = {
    parentSkus: parentSkus,
    plant: String(d.plant).trim(),
    otherNames: d.otherNames ? String(d.otherNames).trim() : undefined,
    variety: d.variety ? String(d.variety).trim() : undefined,
    colour: d.colour ? String(d.colour).trim() : undefined,
    height: typeof d.height === 'number' ? d.height : undefined,
    mossStick: d.mossStick ? String(d.mossStick).trim() : undefined,
    size: typeof d.size === 'number' ? d.size : undefined,
    type: d.type ? String(d.type).trim() : undefined,
    finalName: generateFinalName({
      plant: String(d.plant).trim(),
      otherNames: d.otherNames ? String(d.otherNames).trim() : undefined,
      variety: d.variety ? String(d.variety).trim() : undefined,
      colour: d.colour ? String(d.colour).trim() : undefined,
      size: typeof d.size === 'number' ? d.size : undefined,
      type: d.type ? String(d.type).trim() : undefined,
    }),
    description: d.description ? String(d.description).trim() : undefined,
    quantity: Number(d.quantity),
    price: totalPrice,
    inventory_quantity: minInventoryQuantity === Infinity ? 0 : minInventoryQuantity,
    categories: Array.from(combinedCategories),
    collectionIds: Array.from(combinedCollectionIds),
    images: (d.images as unknown[]).map((img) => String(img).trim()).filter(Boolean),
    sku: sku,
    section: d.section as ListingSection,
    status: (d.status as ListingStatus) || 'draft',
    seller: d.seller ? String(d.seller).trim() : undefined,
    hub: hub,
    substores: substores.length > 0 ? substores : undefined,
  };

  return { success: true, data: validated };
}

// Sanitize update data (allows partial updates)
async function sanitizeUpdateData(data: Record<string, unknown>, existing: ListingProduct): Promise<{
  success: boolean;
  message?: string;
  data?: Partial<Omit<ListingProduct, '_id' | 'createdAt'>>;
}> {
  const sanitized: Partial<Omit<ListingProduct, '_id' | 'createdAt'>> = {};

  // Most fields can be updated directly
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
  if (data.description !== undefined) {
    sanitized.description = String(data.description).trim();
  }
  if (data.images !== undefined && Array.isArray(data.images)) {
    sanitized.images = (data.images as unknown[]).map((img) => String(img).trim()).filter(Boolean);
  }
  if (data.status !== undefined && ['draft', 'listed', 'published'].includes(data.status as string)) {
    sanitized.status = data.status as ListingStatus;
  }
  if (data.seller !== undefined) {
    sanitized.seller = String(data.seller).trim();
  }
  if (data.hub !== undefined) {
    const hub = String(data.hub).trim() || undefined;
    sanitized.hub = hub;
    sanitized.substores = hub ? getSubstoresByHub(hub) : [];
  }

  // Regenerate finalName if any relevant fields changed
  if (data.plant !== undefined || data.otherNames !== undefined || data.variety !== undefined || 
      data.colour !== undefined || data.size !== undefined || data.type !== undefined) {
    sanitized.finalName = generateFinalName({
      plant: sanitized.plant || existing.plant,
      otherNames: sanitized.otherNames !== undefined ? sanitized.otherNames : existing.otherNames,
      variety: sanitized.variety !== undefined ? sanitized.variety : existing.variety,
      colour: sanitized.colour !== undefined ? sanitized.colour : existing.colour,
      size: sanitized.size !== undefined ? sanitized.size : existing.size,
      type: sanitized.type !== undefined ? sanitized.type : existing.type,
    });
  }

  return { success: true, data: sanitized };
}

// Helper function to generate final name
function generateFinalName(data: {
  plant: string;
  otherNames?: string;
  variety?: string;
  colour?: string;
  size?: number;
  type?: string;
}): string {
  const parts = [data.plant];
  
  if (data.otherNames) parts.push(data.otherNames);
  if (data.variety) parts.push(data.variety);
  if (data.colour) parts.push(data.colour);
  if (data.size) parts.push('in', String(data.size), 'inch');
  if (data.type) parts.push(data.type);
  
  return parts.filter(Boolean).join(' ');
}

// Helper function to get auto categories based on rules
async function getAutoCategoriesForProduct(product: {
  plant: string;
  variety?: string;
  colour?: string;
  height?: number;
  size?: number;
  type?: string;
}): Promise<string[]> {
  try {
    const categories = await CategoryModel.findAll();
    const matchingCategories: string[] = [];
    
    for (const category of categories) {
      if (category.rule && evaluateRule(category.rule, product)) {
        matchingCategories.push(category.alias);
      }
    }
    
    return matchingCategories;
  } catch (error) {
    console.error('Error evaluating category rules:', error);
    return [];
  }
}

// Helper function to evaluate a single rule
function evaluateRule(rule: any, product: any): boolean {
  if (!rule || !rule.items || !Array.isArray(rule.items)) {
    return false;
  }
  
  const results = rule.items.map((item: any) => {
    if (item.field && item.value !== undefined) {
      // This is a condition
      return evaluateCondition(item, product);
    } else if (item.rule_operator && item.items) {
      // This is a nested rule
      return evaluateRule(item, product);
    }
    return false;
  });
  
  if (rule.rule_operator === 'AND') {
    return results.every(Boolean);
  } else if (rule.rule_operator === 'OR') {
    return results.some(Boolean);
  }
  
  return false;
}

// Helper function to evaluate a single condition
function evaluateCondition(condition: any, product: any): boolean {
  const field = condition.field;
  const expectedValue = condition.value;
  
  let actualValue: any;
  
  switch (field) {
    case 'Plant':
      actualValue = product.plant;
      break;
    case 'variety':
      actualValue = product.variety;
      break;
    case 'Colour':
      actualValue = product.colour;
      break;
    case 'Height':
      actualValue = product.height;
      break;
    case 'Size':
      actualValue = product.size;
      break;
    case 'Type':
      actualValue = product.type;
      break;
    default:
      return false;
  }
  
  if (actualValue === undefined || actualValue === null) {
    return false;
  }
  
  // For string fields, do case-insensitive comparison
  if (typeof expectedValue === 'string' && typeof actualValue === 'string') {
    return actualValue.toLowerCase().includes(expectedValue.toLowerCase());
  }
  
  // For numeric fields, do exact comparison
  if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
    return actualValue === expectedValue;
  }
  
  return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
}

// Helper function to update parent quantities after listing product creation
async function updateParentQuantitiesAfterCreation(listingProducts: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
  const parentUpdates = new Map<string, { section: ListingSection; quantityToDeduct: number }>();
  
  // Group updates by parent SKU
  for (const listingProduct of listingProducts) {
    for (const parentSku of listingProduct.parentSkus) {
      const existing = parentUpdates.get(parentSku);
      if (existing) {
        existing.quantityToDeduct += listingProduct.quantity;
      } else {
        parentUpdates.set(parentSku, {
          section: listingProduct.section,
          quantityToDeduct: listingProduct.quantity,
        });
      }
    }
  }
  
  // Update each parent
  for (const [parentSku, update] of parentUpdates) {
    const parent = await ParentMasterModel.findBySku(parentSku);
    if (parent && parent.typeBreakdown) {
      const currentQuantity = parent.typeBreakdown[update.section] || 0;
      const newQuantity = Math.max(0, currentQuantity - update.quantityToDeduct);
      
      const updatedTypeBreakdown: PurchaseTypeBreakdown = {
        ...parent.typeBreakdown,
        [update.section]: newQuantity,
      };
      
      await ParentMasterModel.update(parent._id!, {
        typeBreakdown: updatedTypeBreakdown,
      });
    }
  }
}
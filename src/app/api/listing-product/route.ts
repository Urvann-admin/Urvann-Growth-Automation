import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ListingProductModel } from '@/models/listingProduct';
import type { ListingProduct, ListingSection, ListingStatus, ListingParentItem } from '@/models/listingProduct';
import { ParentMasterModel } from '@/models/parentMaster';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { CategoryModel } from '@/models/category';
import { generateSKU } from '@/lib/skuGenerator';
import { getSubstoresByHub } from '@/shared/constants/hubs';
import { getPotPrice } from '@/shared/constants/pots';
import { withDerivedParentSkus } from '@/models/listingProduct';

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
      data: result.items.map((item) => withDerivedParentSkus(item as ListingProduct)),
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
      data: withDerivedParentSkus(created as ListingProduct),
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
    const sanitized = await sanitizeUpdateData(updateData, existing as ListingProduct);
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

  // New flow: prefer detailed parentItems if present
  const hasParentItems = Array.isArray((d as any).parentItems) && (d as any).parentItems.length > 0;

  // Required fields
  if (!hasParentItems && (!Array.isArray(d.parentSkus) || d.parentSkus.length === 0)) {
    return { success: false, message: 'Either parentItems or parentSkus is required and must be non-empty' };
  }

  if (!d.plant || typeof d.plant !== 'string' || !String(d.plant).trim()) {
    return { success: false, message: 'plant is required and must be a non-empty string' };
  }

  if (!hasParentItems) {
    // Legacy single-quantity flow
    if (d.quantity === undefined || d.quantity === null || typeof d.quantity !== 'number' || d.quantity <= 0) {
      return { success: false, message: 'quantity is required and must be a positive number' };
    }
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

  // Build parentItems list for calculations (supports legacy + new flow)
  let parentItems: ListingParentItem[] = [];

  if (hasParentItems) {
    parentItems = ((d as any).parentItems as any[]).map((item) => ({
      parentSku: String(item.parentSku || '').trim(),
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
    })).filter((item) => item.parentSku && item.quantity > 0);

    if (parentItems.length === 0) {
      return { success: false, message: 'parentItems must contain at least one valid parent with positive quantity' };
    }
  } else {
    // Fallback legacy shape: use parentSkus + global quantity
    const parentSkusLegacy = (d.parentSkus as string[]).map((sku) => String(sku).trim()).filter(Boolean);
    parentItems = parentSkusLegacy.map((sku) => ({
      parentSku: sku,
      quantity: Number(d.quantity),
      unitPrice: 0, // will be filled from parent.price below
    }));
  }

  const parentSkus = parentItems.map((item) => item.parentSku);
  const parents = await Promise.all(parentSkus.map((sku) => ParentMasterModel.findBySku(sku)));
  
  for (let i = 0; i < parents.length; i++) {
    const parent = parents[i];
    if (!parent) {
      return { success: false, message: `Parent with SKU ${parentSkus[i]} not found` };
    }
    const requiredFromParent = parentItems[i].quantity;
    const availableQuantity = parent.inventory_quantity ?? 0;
    if (availableQuantity < requiredFromParent) {
      return { success: false, message: `Insufficient quantity for parent ${parentSkus[i]}. Available: ${availableQuantity}, Required: ${requiredFromParent}` };
    }
  }

  // Calculate price and inventory_quantity
  let totalPrice = 0;
  let minInventoryQuantity = Infinity;
  const combinedCategories = new Set<string>();
  const combinedCollectionIds = new Set<string>();

  // Helper: find parentMaster for a given sku
  const getParentForSku = (sku: string) => {
    const index = parentSkus.indexOf(sku);
    return index >= 0 ? parents[index] : undefined;
  };

  for (const item of parentItems) {
    const parent = getParentForSku(item.parentSku);
    if (!parent) continue;

    const effectiveUnitPrice = parent.price || 0;
    item.unitPrice = effectiveUnitPrice;

    // Price contribution from this parent in ONE set
    totalPrice += effectiveUnitPrice * item.quantity;

    const availableQuantity = parent.inventory_quantity ?? 0;
    const inventoryForThisParent = item.quantity > 0
      ? Math.floor(availableQuantity / item.quantity)
      : 0;
    minInventoryQuantity = Math.min(minInventoryQuantity, inventoryForThisParent);

    // Combine categories
    if (parent.categories) {
      parent.categories.forEach((cat: string) => combinedCategories.add(cat));
    }

    // Combine collection IDs
    if (parent.collectionIds) {
      parent.collectionIds.forEach((id: string) => combinedCollectionIds.add(String(id)));
    }
  }

  // Pot based pricing
  const potQuantity = typeof (d as any).potQuantity === 'number'
    ? (d as any).potQuantity
    : Number((d as any).potQuantity || 0);
  const potSize = typeof d.size === 'number' ? d.size : typeof d.size === 'string' ? parseFloat(d.size) : undefined;
  const potType = d.type ? String(d.type).trim() : undefined;

  const potPricePerUnit = getPotPrice(potType, potSize);
  if (potQuantity > 0 && potPricePerUnit > 0) {
    totalPrice += potPricePerUnit * potQuantity;
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
  const setQuantity = typeof (d as any).setQuantity === 'number'
    ? (d as any).setQuantity
    : Number((d as any).setQuantity || 0);

  const skuQuantityForCode = setQuantity > 0
    ? setQuantity
    : typeof d.quantity === 'number'
      ? d.quantity
      : Number(d.quantity || 0) || 1;

  if (d.hub && d.plant && skuQuantityForCode) {
    try {
      sku = await generateSKU(String(d.hub).trim(), String(d.plant).trim(), skuQuantityForCode);
    } catch (error) {
      console.error('SKU generation failed:', error);
      return { success: false, message: `SKU generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  const hub = d.hub ? String(d.hub).trim() : undefined;
  const substores = hub ? getSubstoresByHub(hub) : [];

  // Build validated object (only parentItems persisted; parentSkus is derived from parentItems when needed)
  const validated: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'> = {
    parentItems,
    plant: String(d.plant).trim(),
    otherNames: d.otherNames ? String(d.otherNames).trim() : undefined,
    variety: d.variety ? String(d.variety).trim() : undefined,
    colour: d.colour ? String(d.colour).trim() : undefined,
    height: typeof d.height === 'number' ? d.height : undefined,
    mossStick: d.mossStick ? String(d.mossStick).trim() : undefined,
    size: typeof d.size === 'number' ? d.size : potSize,
    type: potType,
    finalName: (() => {
      const setQty = setQuantity > 0 ? setQuantity : 1;
      const getParent = (sku: string): { finalName?: string; plant?: string } | undefined => {
        const p = getParentForSku(sku);
        if (!p) return undefined;
        return { finalName: (p as { finalName?: string; plant?: string }).finalName, plant: (p as { finalName?: string; plant?: string }).plant };
      };
      const fromParents = generateFinalNameFromParents(parentItems, getParent, potSize, potType, setQty);
      return fromParents || generateFinalName({
        plant: String(d.plant).trim(),
        otherNames: d.otherNames ? String(d.otherNames).trim() : undefined,
        variety: d.variety ? String(d.variety).trim() : undefined,
        colour: d.colour ? String(d.colour).trim() : undefined,
        size: typeof d.size === 'number' ? d.size : undefined,
        type: d.type ? String(d.type).trim() : undefined,
      });
    })(),
    description: d.description ? String(d.description).trim() : undefined,
    quantity: typeof d.quantity === 'number' ? d.quantity : Number(d.quantity || 0) || 1,
    setQuantity: setQuantity > 0 ? setQuantity : undefined,
    potQuantity: potQuantity > 0 ? potQuantity : undefined,
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

// Helper: name of parent (before ' in ') for listing name
function parentNameBeforeIn(parent: { finalName?: string; plant?: string } | null): string {
  if (!parent) return '';
  const name = String((parent.finalName || parent.plant || '').trim());
  const idx = name.toLowerCase().indexOf(' in ');
  return idx >= 0 ? name.slice(0, idx).trim() : name;
}

/** Generate final name: when setQty=1: parent1 & parent2 in size inch type; when setQty>1: Set of N parent1 & parent2 in size inch type */
function generateFinalNameFromParents(
  parentItems: { parentSku: string }[],
  getParent: (sku: string) => { finalName?: string; plant?: string } | undefined,
  size?: number,
  type?: string,
  setQuantity: number = 1
): string {
  const parentNames = parentItems
    .map((item) => parentNameBeforeIn(getParent(item.parentSku) ?? null))
    .filter(Boolean);
  if (parentNames.length === 0) return '';
  const parts = [parentNames.join(' & ')];
  if (size) parts.push(`in ${size} inch`);
  if (type) parts.push(type);
  const base = parts.join(' ');
  if (setQuantity > 1) return `Set of ${setQuantity} ${base}`;
  return base;
}

// Helper function to generate final name (legacy: from plant/variety/colour etc.)
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
  
  // Group updates by parent SKU.
  // New semantics:
  // - For each listing product, we deduct:
  //     inventory_quantity * parentItem.quantity
  //   units from each parent used in the composition.
  for (const listingProduct of listingProducts) {
    const items: ListingParentItem[] =
      (listingProduct.parentItems && listingProduct.parentItems.length > 0)
        ? listingProduct.parentItems
        : (listingProduct.parentSkus ?? []).map((sku) => ({
            parentSku: sku,
            quantity: listingProduct.quantity,
            unitPrice: 0,
          }));

    for (const item of items) {
      const key = item.parentSku;
      const totalUnitsToDeduct = (listingProduct.inventory_quantity || 0) * (item.quantity || 0);
      if (totalUnitsToDeduct <= 0) continue;

      const existing = parentUpdates.get(key);
      if (existing) {
        existing.quantityToDeduct += totalUnitsToDeduct;
      } else {
        parentUpdates.set(key, {
          section: listingProduct.section,
          quantityToDeduct: totalUnitsToDeduct,
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
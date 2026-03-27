import { NextRequest, NextResponse } from 'next/server';
import { ParentMasterModel, isBaseParent, type ParentMaster } from '@/models/parentMaster';
import { ListingProductModel } from '@/models/listingProduct';
import { ProcurementSellerMasterModel } from '@/models/procurementSellerMaster';
import { generateParentSKUGlobal } from '@/lib/skuGenerator';

/** Serialize parent for API response: add `price` for backward compatibility (sellingPrice → price) */
export function serializeParent(doc: ParentMaster | null): (ParentMaster & { price?: number }) | null {
  if (!doc) return null;
  const price = doc.sellingPrice ?? doc.price;
  return { ...doc, price };
}

function normalizeProductType(d: Record<string, unknown>): 'parent' | 'growing_product' | 'consumable' {
  const t = d.productType;
  if (t === 'growing_product' || t === 'consumable' || t === 'parent') return t;
  return 'parent';
}

function escapeRegexFragment(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const parentSku = searchParams.get('parentSku') || '';
    const nameSearch = searchParams.get('nameSearch') || '';
    const category = searchParams.get('category') || '';
    const section = searchParams.get('section') || '';
    const minQuantity = parseInt(searchParams.get('minQuantity') || '0', 10);
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const baseParentsOnly = searchParams.get('baseParentsOnly') === 'true';
    const excludeListed = searchParams.get('excludeListed') === 'true';

    const andParts: Record<string, unknown>[] = [];

    if (search) {
      const regex = new RegExp(search, 'i');
      const trimmed = String(search).trim();
      andParts.push({
        $or: [
          { plant: regex },
          { otherNames: regex },
          { variety: regex },
          { potType: regex },
          { type: regex },
          ...(trimmed ? [{ sku: trimmed }, { productCode: trimmed }] : []),
        ],
      });
    }

    const parentSkuTrim = String(parentSku).trim();
    if (parentSkuTrim) {
      const rx = new RegExp(escapeRegexFragment(parentSkuTrim), 'i');
      andParts.push({
        $or: [{ sku: rx }, { productCode: rx }],
      });
    }

    const nameTrim = String(nameSearch).trim();
    if (nameTrim) {
      const rx = new RegExp(escapeRegexFragment(nameTrim), 'i');
      andParts.push({
        $or: [
          { plant: rx },
          { otherNames: rx },
          { variety: rx },
          { finalName: rx },
          { potType: rx },
          { type: rx },
        ],
      });
    }

    if (category) {
      andParts.push({ categories: category });
    }

    if (section && ['listing', 'revival', 'growth', 'consumer'].includes(section)) {
      const sectionField = `typeBreakdown.${section}`;
      andParts.push({ [sectionField]: { $gt: minQuantity } });
    }

    if (baseParentsOnly) {
      andParts.push({
        $or: [{ productType: { $exists: false } }, { productType: 'parent' }],
      });
    }

    /** Optional: hide base parents already marked `isListed` and/or with a parent-type listing (legacy UIs; listing screen loads all base parents by default). */
    if (excludeListed) {
      andParts.push({ isListed: { $ne: true } });
      const listedCanonicalSkus = await ListingProductModel.getCanonicalParentSkusWithParentListings();
      if (listedCanonicalSkus.length > 0) {
        andParts.push({ sku: { $nin: listedCanonicalSkus } });
      }
    }

    const query: Record<string, unknown> =
      andParts.length === 0 ? {} : andParts.length === 1 ? andParts[0]! : { $and: andParts };

    const result = await ParentMasterModel.findWithPagination(
      query,
      page,
      limit,
      sortField,
      sortOrder as 1 | -1
    );

    const data = (result.items as ParentMaster[]).map((item) => serializeParent(item));

    return NextResponse.json({
      success: true,
      data,
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

    // Handle bulk create (CSV / array) — all rows treated as parent-type products
    if (Array.isArray(body)) {
      const validatedItems: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>[] = [];

      for (const item of body) {
        const row = typeof item === 'object' && item !== null ? { ...item, productType: 'parent' } : item;
        const validated = validateParentMasterData(row);
        if (!validated.success) {
          return NextResponse.json(
            { success: false, message: validated.message },
            { status: 400 }
          );
        }
        validatedItems.push(validated.data!);
      }

      for (let i = 0; i < validatedItems.length; i++) {
        const item = validatedItems[i];
        if (item.plant) {
          try {
            const sku = await generateParentSKUGlobal(item.plant);
            (validatedItems[i] as Record<string, unknown>).sku = sku;
            (validatedItems[i] as Record<string, unknown>).productCode = sku;
          } catch (error) {
            console.error('SKU generation failed for bulk row:', error);
            return NextResponse.json(
              {
                success: false,
                message: `SKU generation failed for plant "${item.plant}": ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
              { status: 422 }
            );
          }
        }
        if (item.seller && item.sellingPrice != null) {
          const procurementSeller = await ProcurementSellerMasterModel.findById(item.seller);
          const factor = procurementSeller?.multiplicationFactor ?? 1;
          (validatedItems[i] as Record<string, unknown>).listing_price = Number(item.sellingPrice) * factor;
        }
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

    const data = validated.data!;
    const pt = data.productType ?? 'parent';

    if (pt === 'parent') {
      let sku: string;
      try {
        sku = await generateParentSKUGlobal(data.plant);
      } catch (error) {
        console.error('SKU generation failed:', error);
        return NextResponse.json(
          {
            success: false,
            message: `SKU generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
          { status: 422 }
        );
      }

      let listing_price: number | undefined;
      if (data.seller && data.sellingPrice != null) {
        const procurementSeller = await ProcurementSellerMasterModel.findById(data.seller);
        const factor = procurementSeller?.multiplicationFactor ?? 1;
        listing_price = Number(data.sellingPrice) * factor;
      }

      const dataToSave: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        productType: 'parent',
        sku,
        productCode: sku,
        ...(listing_price !== undefined && { listing_price }),
      };

      const created = await ParentMasterModel.create(dataToSave);
      console.log('Product saved to DB:', created._id);
      return NextResponse.json({
        success: true,
        data: serializeParent(created as ParentMaster),
      });
    }

    // growing_product | consumable — productCode = typed code; sku = linked base parent SKU
    const productCode = String(data.productCode ?? '').trim();
    if (!productCode) {
      return NextResponse.json(
        { success: false, message: 'productCode is required for this product type' },
        { status: 400 }
      );
    }

    const existingPc = await ParentMasterModel.findByProductCode(productCode);
    if (existingPc) {
      return NextResponse.json(
        { success: false, message: 'A product with this product code already exists' },
        { status: 409 }
      );
    }

    const parentLinkSku = String(data.sku ?? '').trim();

    if (pt === 'growing_product') {
      if (!parentLinkSku) {
        return NextResponse.json(
          { success: false, message: 'sku (base parent SKU) is required for growing_product' },
          { status: 400 }
        );
      }
      const linked = await ParentMasterModel.findBySku(parentLinkSku);
      if (!linked || !isBaseParent(linked)) {
        return NextResponse.json(
          { success: false, message: 'sku must be the SKU of an existing base (parent) product' },
          { status: 400 }
        );
      }
    }

    if (pt === 'consumable' && parentLinkSku) {
      const linked = await ParentMasterModel.findBySku(parentLinkSku);
      if (!linked || !isBaseParent(linked)) {
        return NextResponse.json(
          { success: false, message: 'sku must be the SKU of an existing base (parent) product' },
          { status: 400 }
        );
      }
    }

    let listing_price: number | undefined;
    if (data.seller && data.sellingPrice != null) {
      const procurementSeller = await ProcurementSellerMasterModel.findById(data.seller);
      const factor = procurementSeller?.multiplicationFactor ?? 1;
      listing_price = Number(data.sellingPrice) * factor;
    }

    const finalName = data.finalName?.trim() || data.plant.trim();

    const dataToSave: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'> = {
      ...data,
      productType: pt,
      productCode,
      ...(parentLinkSku ? { sku: parentLinkSku } : {}),
      parentSku: undefined,
      finalName,
      categories: Array.isArray(data.categories) ? data.categories : [],
      ...(listing_price !== undefined && { listing_price }),
    };

    const created = await ParentMasterModel.create(dataToSave);
    console.log('Product saved to DB:', created._id);
    return NextResponse.json({
      success: true,
      data: serializeParent(created as ParentMaster),
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

    let sanitized = sanitizeParentMasterUpdate(updateData);

    if (sanitized.productCode !== undefined) {
      const pcTrim = String(sanitized.productCode).trim();
      const other = await ParentMasterModel.findByProductCode(pcTrim);
      if (other && String(other._id) !== String(_id)) {
        return NextResponse.json(
          { success: false, message: 'A product with this product code already exists' },
          { status: 409 }
        );
      }
      sanitized = { ...sanitized, productCode: pcTrim || undefined };
    }

    if (sanitized.sku !== undefined) {
      const skuTrim = String(sanitized.sku).trim();
      const doc = await ParentMasterModel.findById(_id);
      const resolved = skuTrim ? await ParentMasterModel.findBySku(skuTrim) : null;
      if (doc && isBaseParent(doc)) {
        if (resolved && isBaseParent(resolved) && String(resolved._id) !== String(_id)) {
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
      sanitized = { ...sanitized, sku: skuTrim };
    }

    if (sanitized.parentSku !== undefined && sanitized.parentSku) {
      const linked = await ParentMasterModel.findBySku(String(sanitized.parentSku).trim());
      if (!linked || !isBaseParent(linked)) {
        return NextResponse.json(
          { success: false, message: 'parentSku must be the SKU of an existing base (parent) product' },
          { status: 400 }
        );
      }
    }

    const updatingSeller = sanitized.seller !== undefined || updateData.seller != null;
    const updatingPrice =
      sanitized.sellingPrice !== undefined ||
      updateData.sellingPrice != null ||
      updateData.price != null;
    if (updatingSeller || updatingPrice) {
      const existing = await ParentMasterModel.findById(_id);
      const sellerId =
        (sanitized.seller ??
          existing?.seller ??
          (updateData.seller != null ? String(updateData.seller).trim() : null)) ??
        null;
      const priceVal =
        sanitized.sellingPrice ??
        (existing && 'sellingPrice' in existing ? Number(existing.sellingPrice) : null) ??
        (existing && 'price' in existing ? Number(existing.price) : null) ??
        (updateData.sellingPrice != null ? Number(updateData.sellingPrice) : null) ??
        (updateData.price != null ? Number(updateData.price) : null);
      if (sellerId != null && sellerId !== '' && priceVal != null && !isNaN(priceVal)) {
        const procurementSeller = await ProcurementSellerMasterModel.findById(sellerId);
        const factor = procurementSeller?.multiplicationFactor ?? 1;
        sanitized = { ...sanitized, listing_price: priceVal * factor };
      }
    }

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

function validateParentMasterData(data: unknown): {
  success: boolean;
  message?: string;
  data?: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>;
} {
  if (!data || typeof data !== 'object') {
    return { success: false, message: 'Invalid data format' };
  }

  const d = data as Record<string, unknown>;
  const productType = normalizeProductType(d);

  if (!d.plant || typeof d.plant !== 'string' || !String(d.plant).trim()) {
    return { success: false, message: 'plant is required and must be a non-empty string' };
  }

  const priceVal = d.sellingPrice ?? d.price;
  if (priceVal !== undefined && priceVal !== null && (typeof priceVal !== 'number' || priceVal < 0)) {
    return { success: false, message: 'sellingPrice must be a non-negative number when provided' };
  }

  if (d.compare_at !== undefined && d.compare_at !== null && d.compare_at !== '') {
    const ca = typeof d.compare_at === 'number' ? d.compare_at : parseFloat(String(d.compare_at));
    if (Number.isNaN(ca) || ca < 0) {
      return { success: false, message: 'compare_at must be a non-negative number when provided' };
    }
  }

  if (d.images !== undefined && d.images !== null && !Array.isArray(d.images)) {
    return { success: false, message: 'images must be an array when provided' };
  }

  const sellingPriceNum =
    d.sellingPrice != null && typeof d.sellingPrice === 'number'
      ? Number(d.sellingPrice)
      : d.price != null && typeof d.price === 'number'
        ? Number(d.price)
        : undefined;
  let compareAtNum: number | undefined;
  if (d.compare_at != null && d.compare_at !== '') {
    const ca = typeof d.compare_at === 'number' ? d.compare_at : parseFloat(String(d.compare_at));
    if (!Number.isNaN(ca) && ca >= 0) compareAtNum = ca;
  }
  const potTypeVal = d.potType ? String(d.potType).trim() : d.type ? String(d.type).trim() : undefined;

  const categoriesRaw = d.categories;
  if (productType === 'parent') {
    if (!Array.isArray(categoriesRaw)) {
      return { success: false, message: 'categories must be an array' };
    }
  }

  const categories = Array.isArray(categoriesRaw)
    ? (categoriesRaw as unknown[]).map((c) => String(c).trim()).filter(Boolean)
    : [];

  if (productType === 'growing_product') {
    const vm = d.vendorMasterId != null ? String(d.vendorMasterId).trim() : '';
    if (!vm) {
      return { success: false, message: 'vendorMasterId is required for growing_product' };
    }
    const pc = d.productCode != null ? String(d.productCode).trim() : '';
    if (!pc) {
      return { success: false, message: 'productCode is required for growing_product' };
    }
    const parentSkuField =
      d.sku != null ? String(d.sku).trim() : d.parentSku != null ? String(d.parentSku).trim() : '';
    if (!parentSkuField) {
      return { success: false, message: 'sku (base parent SKU) is required for growing_product' };
    }
  }

  if (productType === 'consumable') {
    const pc = d.productCode != null ? String(d.productCode).trim() : '';
    if (!pc) {
      return { success: false, message: 'productCode is required for consumable' };
    }
  }

  const productCodeVal =
    d.productCode != null && String(d.productCode).trim() ? String(d.productCode).trim() : undefined;

  const parentLinkSkuVal =
    productType === 'growing_product' || productType === 'consumable'
      ? d.sku != null
        ? String(d.sku).trim()
        : d.parentSku != null
          ? String(d.parentSku).trim()
          : undefined
      : undefined;

  const validated: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'> = {
    productType,
    plant: String(d.plant).trim(),
    otherNames: d.otherNames ? String(d.otherNames).trim() : undefined,
    variety: d.variety ? String(d.variety).trim() : undefined,
    colour: d.colour ? String(d.colour).trim() : undefined,
    height: typeof d.height === 'number' ? d.height : undefined,
    mossStick: d.mossStick ? String(d.mossStick).trim() : undefined,
    size: typeof d.size === 'number' ? d.size : undefined,
    potType: potTypeVal || undefined,
    seller: d.seller ? String(d.seller).trim() : undefined,
    vendorMasterId:
      d.vendorMasterId != null && String(d.vendorMasterId).trim()
        ? String(d.vendorMasterId).trim()
        : undefined,
    features: d.features ? String(d.features).trim() : undefined,
    redirects: d.redirects ? String(d.redirects).trim() : undefined,
    description: d.description ? String(d.description).trim() : undefined,
    finalName: d.finalName ? String(d.finalName).trim() : undefined,
    categories,
    sellingPrice: sellingPriceNum,
    ...(compareAtNum !== undefined ? { compare_at: compareAtNum } : {}),
    images: Array.isArray(d.images)
      ? (d.images as unknown[]).map((img) => String(img).trim()).filter(Boolean)
      : undefined,
    inventory_quantity: typeof d.inventory_quantity === 'number' ? d.inventory_quantity : undefined,
    collectionIds: Array.isArray(d.collectionIds)
      ? (d.collectionIds as unknown[]).map((c) => String(c).trim()).filter(Boolean)
      : undefined,
    ...(productType !== 'parent' && productCodeVal ? { productCode: productCodeVal } : {}),
    ...(productType !== 'parent' && parentLinkSkuVal ? { sku: parentLinkSkuVal } : {}),
  };

  if (productType === 'parent') {
    validated.productType = 'parent';
  }

  return { success: true, data: validated };
}

/** Sanitize update payload (partial). Exported for [id] route. */
export function sanitizeParentMasterUpdate(data: Record<string, unknown>): Partial<Omit<ParentMaster, '_id' | 'createdAt'>> {
  const sanitized: Partial<Omit<ParentMaster, '_id' | 'createdAt'>> = {};

  if (data.productType !== undefined) {
    const t = data.productType;
    if (t === 'parent' || t === 'growing_product' || t === 'consumable') {
      sanitized.productType = t;
    }
  }
  if (data.vendorMasterId !== undefined) {
    const v = String(data.vendorMasterId).trim();
    sanitized.vendorMasterId = v || undefined;
  }
  if (data.parentSku !== undefined) {
    const p = String(data.parentSku).trim();
    sanitized.parentSku = p || undefined;
  }
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
  if (data.potType !== undefined) {
    sanitized.potType = String(data.potType).trim();
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
  if (data.features !== undefined) {
    sanitized.features = String(data.features).trim() || undefined;
  }
  if (data.redirects !== undefined) {
    sanitized.redirects = String(data.redirects).trim() || undefined;
  }
  if (data.categories !== undefined && Array.isArray(data.categories)) {
    sanitized.categories = (data.categories as unknown[]).map((c) => String(c).trim()).filter(Boolean);
  }
  if (data.collectionIds !== undefined && Array.isArray(data.collectionIds)) {
    sanitized.collectionIds = (data.collectionIds as unknown[]).map((c) => String(c).trim()).filter(Boolean);
  }
  if (data.sellingPrice !== undefined) {
    sanitized.sellingPrice =
      typeof data.sellingPrice === 'number' ? data.sellingPrice : parseFloat(String(data.sellingPrice)) || 0;
  }
  if (data.compare_at !== undefined) {
    if (data.compare_at === null || data.compare_at === '') {
      sanitized.compare_at = null;
    } else {
      const ca = typeof data.compare_at === 'number' ? data.compare_at : parseFloat(String(data.compare_at));
      sanitized.compare_at = !Number.isNaN(ca) && ca >= 0 ? ca : null;
    }
  }
  if (data.price !== undefined) {
    sanitized.price = typeof data.price === 'number' ? data.price : parseFloat(String(data.price)) || 0;
  }
  if (data.listing_price !== undefined) {
    sanitized.listing_price =
      typeof data.listing_price === 'number'
        ? data.listing_price
        : parseFloat(String(data.listing_price)) || undefined;
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
  if (data.sku !== undefined) {
    sanitized.sku = String(data.sku).trim();
  }
  if (data.productCode !== undefined) {
    const p = String(data.productCode).trim();
    sanitized.productCode = p || undefined;
  }

  return sanitized;
}

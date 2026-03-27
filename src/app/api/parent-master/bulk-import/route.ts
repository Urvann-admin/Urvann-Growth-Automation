import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ParentMasterModel } from '@/models/parentMaster';
import type { ParentMaster } from '@/models/parentMaster';
import { ProcurementSellerMasterModel } from '@/models/procurementSellerMaster';
import { CollectionMasterModel } from '@/models/collectionMaster';
import type { CollectionMaster } from '@/models/collectionMaster';
import { generateParentSKUGlobal } from '@/lib/skuGenerator';
import { uploadImageBufferToS3 } from '@/lib/s3Upload';

/** Canonical CSV column keys (order matches downloadable template). */
const TEMPLATE_HEADERS = [
  'plant',
  'otherNames',
  'variety',
  'colour',
  'height',
  'mossStick',
  'size',
  'potType',
  'description',
  'categories',
  'collection',
  'sellingPrice',
  'seller',
  'compare_at',
  'features',
  'redirects',
  'inventory_quantity',
  'image',
] as const;

/** Map normalized header text → canonical key (first match wins per canonical). */
const HEADER_ALIAS_GROUPS: { key: (typeof TEMPLATE_HEADERS)[number]; aliases: string[] }[] = [
  { key: 'plant', aliases: ['plant'] },
  { key: 'otherNames', aliases: ['otherNames', 'othernames', 'other_names', 'other names'] },
  { key: 'variety', aliases: ['variety'] },
  { key: 'colour', aliases: ['colour', 'color'] },
  { key: 'height', aliases: ['height'] },
  { key: 'mossStick', aliases: ['mossstick', 'moss_stick', 'moss stick'] },
  { key: 'size', aliases: ['size'] },
  { key: 'potType', aliases: ['pottype', 'pot_type', 'pot type', 'type'] },
  { key: 'description', aliases: ['description'] },
  { key: 'categories', aliases: ['categories', 'category'] },
  {
    key: 'collection',
    aliases: ['collection', 'collections', 'collectionids', 'collection_ids', 'collection ids'],
  },
  { key: 'sellingPrice', aliases: ['sellingprice', 'selling_price', 'selling price', 'price'] },
  { key: 'seller', aliases: ['seller'] },
  {
    key: 'compare_at',
    aliases: ['compare_at', 'compareat', 'compare_at_price', 'compare at price', 'compare-at price'],
  },
  { key: 'features', aliases: ['features', 'feature'] },
  { key: 'redirects', aliases: ['redirects', 'redirect'] },
  {
    key: 'inventory_quantity',
    aliases: ['inventory_quantity', 'inventoryquantity', 'inventory qty', 'inventory'],
  },
  { key: 'image', aliases: ['image', 'images', 'image_url', 'image url', 'imageurl'] },
];

function normalizeHeaderCell(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_');
}

const HEADER_CELL_TO_KEY: Record<string, (typeof TEMPLATE_HEADERS)[number]> = (() => {
  const m: Record<string, (typeof TEMPLATE_HEADERS)[number]> = {};
  for (const { key, aliases } of HEADER_ALIAS_GROUPS) {
    for (const a of aliases) {
      m[normalizeHeaderCell(a)] = key;
    }
  }
  return m;
})();

function buildHeaderIndex(headerLine: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  headerLine.forEach((cell, i) => {
    const n = normalizeHeaderCell(cell);
    const key = HEADER_CELL_TO_KEY[n];
    if (key && index[key] === undefined) index[key] = i;
  });
  return index;
}

const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || 'urvann-growth-parent-images';
const FETCH_TIMEOUT_MS = 30_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Parse a single CSV line respecting quoted fields (handles commas inside quotes). */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let value = '';
      i += 1;
      while (i < line.length) {
        if (line[i] === '"') {
          i += 1;
          if (line[i] === '"') {
            value += '"';
            i += 1;
          } else break;
        } else {
          value += line[i];
          i += 1;
        }
      }
      result.push(value);
    } else {
      const comma = line.indexOf(',', i);
      const end = comma === -1 ? line.length : comma;
      result.push(line.slice(i, end).trim());
      i = comma === -1 ? line.length : comma + 1;
    }
  }
  return result;
}

function computeFinalName(row: Record<string, string>): string {
  const parts: string[] = [];
  if (row.plant?.trim()) parts.push(row.plant.trim());
  if (row.otherNames?.trim()) parts.push(row.otherNames.trim());
  if (row.variety?.trim()) parts.push(row.variety.trim());
  if (row.colour?.trim()) parts.push(row.colour.trim());
  if (row.size?.trim() && !Number.isNaN(Number(row.size))) {
    parts.push('in', String(row.size).trim(), 'inch');
  }
  const potType = row.potType?.trim() || row.type?.trim();
  if (potType) parts.push(potType);
  return parts.join(' ');
}

function resolveCollectionIds(
  raw: string,
  allCollections: CollectionMaster[]
): { success: true; ids: string[] } | { success: false; message: string } {
  if (!raw.trim()) return { success: true, ids: [] };
  const tokens = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const ids: string[] = [];
  for (const token of tokens) {
    let doc: CollectionMaster | undefined;
    if (ObjectId.isValid(token)) {
      doc = allCollections.find((c) => String(c._id) === token);
    }
    if (!doc) {
      const lower = token.toLowerCase();
      doc = allCollections.find(
        (c) =>
          (c.alias && c.alias.toLowerCase() === lower) ||
          (c.name && c.name.toLowerCase() === lower)
      );
    }
    if (!doc) {
      return { success: false, message: `Unknown collection: "${token}"` };
    }
    const id = String(doc._id);
    if (!ids.includes(id)) ids.push(id);
  }
  return { success: true, ids };
}

async function importImageUrlToS3(url: string): Promise<{ url?: string; skipped?: boolean; error?: string }> {
  const trimmed = url.trim();
  if (!trimmed) return { skipped: true };

  if (trimmed.includes(`${S3_BUCKET}.s3.`) && trimmed.includes('amazonaws.com')) {
    return { url: trimmed, skipped: true };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { error: 'Invalid image URL' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Image URL must be http(s)' };
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(trimmed, { redirect: 'follow', signal: controller.signal });
  } catch (e) {
    clearTimeout(tid);
    const msg = e instanceof Error ? e.message : 'Fetch failed';
    return { error: msg.includes('abort') ? 'Image download timed out' : msg };
  } finally {
    clearTimeout(tid);
  }

  if (!res.ok) {
    return { error: `Image download failed (HTTP ${res.status})` };
  }

  const rawCt = res.headers.get('content-type') || '';
  const contentType = rawCt.split(';')[0].trim().toLowerCase();
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(contentType)) {
    return { error: `Not an allowed image type (${contentType || 'unknown'})` };
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > MAX_IMAGE_BYTES) {
    return { error: 'Image larger than 5MB' };
  }

  const up = await uploadImageBufferToS3(buf, contentType, 'parent-master');
  if (!up.success || !up.url) {
    return { error: up.error || 'S3 upload failed' };
  }
  return { url: up.url };
}

type ParsedBulkRow = {
  data: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>;
  imageUrls: string[];
};

function rowToParsedBulkRow(
  row: Record<string, string>,
  headerIndex: Record<string, number>,
  allCollections: CollectionMaster[]
): ParsedBulkRow | { success: false; message: string } {
  const get = (key: string) =>
    (headerIndex[key] !== undefined ? row[String(headerIndex[key])] ?? '' : '').trim();

  const plant = get('plant');
  if (!plant) {
    return { success: false, message: 'plant is required' };
  }

  const priceStr = get('sellingPrice');
  const priceParsed = priceStr ? parseFloat(priceStr) : NaN;
  const sellingPrice = Number.isFinite(priceParsed) && priceParsed >= 0 ? priceParsed : undefined;
  if (priceStr && (Number.isNaN(priceParsed) || priceParsed < 0)) {
    return { success: false, message: `Invalid sellingPrice for row (plant: ${plant})` };
  }

  const compareStr = get('compare_at');
  let compare_at: number | undefined;
  if (compareStr) {
    const c = parseFloat(compareStr);
    if (Number.isNaN(c) || c < 0) {
      return { success: false, message: `Invalid compare_at for row (plant: ${plant})` };
    }
    compare_at = c;
  }

  const invStr = get('inventory_quantity');
  let inventory_quantity: number | undefined;
  if (invStr) {
    const n = parseInt(invStr, 10);
    if (Number.isNaN(n) || n < 0) {
      return { success: false, message: `Invalid inventory_quantity for row (plant: ${plant})` };
    }
    inventory_quantity = n;
  }

  const categoriesStr = get('categories');
  const categories = categoriesStr
    ? categoriesStr.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  const collectionRes = resolveCollectionIds(get('collection'), allCollections);
  if (!collectionRes.success) {
    return { success: false, message: collectionRes.message };
  }
  const collectionIds =
    collectionRes.ids.length > 0 ? collectionRes.ids.map((id) => new ObjectId(id)) : undefined;

  const potType = get('potType') || undefined;
  const heightStr = get('height');
  const sizeStr = get('size');

  const imageCell = get('image');
  const imageUrls = imageCell
    ? imageCell
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  const data: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'> = {
    productType: 'parent',
    plant,
    otherNames: get('otherNames') || undefined,
    variety: get('variety') || undefined,
    colour: get('colour') || undefined,
    height: heightStr && !Number.isNaN(parseFloat(heightStr)) ? parseFloat(heightStr) : undefined,
    mossStick: get('mossStick') || undefined,
    size: sizeStr && !Number.isNaN(parseFloat(sizeStr)) ? parseFloat(sizeStr) : undefined,
    potType: potType || undefined,
    description: get('description') || undefined,
    finalName:
      computeFinalName({
        plant,
        otherNames: get('otherNames'),
        variety: get('variety'),
        colour: get('colour'),
        size: sizeStr,
        potType: get('potType'),
        type: get('potType'),
      }) || undefined,
    categories,
    ...(collectionIds ? { collectionIds } : {}),
    ...(sellingPrice !== undefined && { sellingPrice }),
    ...(compare_at !== undefined && { compare_at }),
    features: get('features') || undefined,
    redirects: get('redirects') || undefined,
    ...(inventory_quantity !== undefined && { inventory_quantity }),
    images: [],
    seller: get('seller') || undefined,
  };

  return { data, imageUrls };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'No file provided. Use form field name "file".' },
        { status: 400 }
      );
    }
    const contentType = file.type || '';
    if (!contentType.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { success: false, message: 'File must be a CSV.' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, message: 'CSV must have a header row and at least one data row.' },
        { status: 400 }
      );
    }

    const headerLine = parseCsvLine(lines[0]);
    const headerIndex = buildHeaderIndex(headerLine);
    if (headerIndex.plant === undefined) {
      return NextResponse.json(
        { success: false, message: 'CSV must include a "plant" column.' },
        { status: 400 }
      );
    }

    const allCollections = (await CollectionMasterModel.findAll()) as CollectionMaster[];

    const parsedRows: ParsedBulkRow[] = [];
    for (let r = 1; r < lines.length; r++) {
      const cells = parseCsvLine(lines[r]);
      const row: Record<string, string> = {};
      headerLine.forEach((_name, i) => {
        row[String(i)] = cells[i] ?? '';
      });
      const out = rowToParsedBulkRow(row, headerIndex, allCollections);
      if (!('data' in out)) {
        return NextResponse.json(
          { success: false, message: `Row ${r + 1}: ${out.message}` },
          { status: 400 }
        );
      }
      parsedRows.push(out);
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid rows to import.' },
        { status: 400 }
      );
    }

    const validatedItems = parsedRows.map((p) => p.data);

    for (let i = 0; i < parsedRows.length; i++) {
      const urls = parsedRows[i].imageUrls;
      if (urls.length === 0) continue;
      const uploaded: string[] = [];
      for (let u = 0; u < urls.length; u++) {
        const result = await importImageUrlToS3(urls[u]);
        if (result.error) {
          return NextResponse.json(
            {
              success: false,
              message: `Row ${i + 2} (${validatedItems[i].plant}): image ${u + 1} — ${result.error}`,
            },
            { status: 400 }
          );
        }
        if (result.url) uploaded.push(result.url);
      }
      validatedItems[i] = { ...validatedItems[i], images: uploaded };
    }

    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i];
      if (!item.plant) continue;
      try {
        const sku = await generateParentSKUGlobal(item.plant);
        (validatedItems[i] as Record<string, unknown>).sku = sku;
        (validatedItems[i] as Record<string, unknown>).productCode = sku;
      } catch (err) {
        console.error('SKU generation failed for row:', err);
        return NextResponse.json(
          {
            success: false,
            message: `SKU generation failed for row ${i + 2} (plant: ${item.plant}): ${err instanceof Error ? err.message : 'Unknown error'}`,
          },
          { status: 422 }
        );
      }
    }

    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i];
      if (item.seller && item.sellingPrice != null && item.sellingPrice >= 0) {
        const procurementSeller = await ProcurementSellerMasterModel.findById(item.seller);
        const factor = procurementSeller?.multiplicationFactor ?? 1;
        (validatedItems[i] as Record<string, unknown>).listing_price = Number(item.sellingPrice) * factor;
      }
    }

    const result = await ParentMasterModel.createMany(validatedItems);
    return NextResponse.json({
      success: true,
      message: `Imported ${result.insertedCount} product(s).`,
      insertedCount: result.insertedCount,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Bulk import failed' },
      { status: 500 }
    );
  }
}

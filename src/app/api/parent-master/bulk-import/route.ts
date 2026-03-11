import { NextRequest, NextResponse } from 'next/server';
import { ParentMasterModel } from '@/models/parentMaster';
import type { ParentMaster } from '@/models/parentMaster';
import { ProcurementSellerMasterModel } from '@/models/procurementSellerMaster';
import { generateParentSKUGlobal } from '@/lib/skuGenerator';

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
  'sellingPrice',
  'seller',
];

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

function rowToParentMaster(
  row: Record<string, string>,
  headerIndex: Record<string, number>
): { success: true; data: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'> } | { success: false; message: string } {
  const get = (key: string) => (headerIndex[key] !== undefined ? row[String(headerIndex[key])] ?? '' : '').trim();
  const plant = get('plant');
  if (!plant) {
    return { success: false, message: 'plant is required' };
  }
  const priceStr = get('sellingPrice') || get('price');
  const priceParsed = priceStr ? parseFloat(priceStr) : NaN;
  const sellingPrice = Number.isFinite(priceParsed) && priceParsed >= 0 ? priceParsed : undefined;
  if (priceStr && (Number.isNaN(priceParsed) || priceParsed < 0)) {
    return { success: false, message: `Invalid sellingPrice for row (plant: ${plant})` };
  }
  const categoriesStr = get('categories');
  const categories = categoriesStr
    ? categoriesStr.split(',').map((c) => c.trim()).filter(Boolean)
    : [];
  const potType = get('potType') || get('type') || undefined;

  const heightStr = get('height');
  const sizeStr = get('size');
  const data: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'> = {
    plant,
    otherNames: get('otherNames') || undefined,
    variety: get('variety') || undefined,
    colour: get('colour') || undefined,
    height: heightStr && !Number.isNaN(parseFloat(heightStr)) ? parseFloat(heightStr) : undefined,
    mossStick: get('mossStick') || undefined,
    size: sizeStr && !Number.isNaN(parseFloat(sizeStr)) ? parseFloat(sizeStr) : undefined,
    potType: potType || undefined,
    description: get('description') || undefined,
    finalName: computeFinalName({
      plant,
      otherNames: get('otherNames'),
      variety: get('variety'),
      colour: get('colour'),
      size: sizeStr,
      potType: get('potType'),
      type: get('type'),
    }) || undefined,
    categories,
    ...(sellingPrice !== undefined && { sellingPrice }),
    images: [],
    seller: get('seller') || undefined,
  };
  return { success: true, data };
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
    const headerIndex: Record<string, number> = {};
    TEMPLATE_HEADERS.forEach((h) => {
      const i = headerLine.findIndex((cell) => cell.trim().toLowerCase() === h.toLowerCase());
      if (i !== -1) headerIndex[h] = i;
    });
    if (headerIndex.plant === undefined) {
      return NextResponse.json(
        { success: false, message: 'CSV must include a "plant" column.' },
        { status: 400 }
      );
    }

    const validatedItems: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>[] = [];
    for (let r = 1; r < lines.length; r++) {
      const cells = parseCsvLine(lines[r]);
      const row: Record<string, string> = {};
      headerLine.forEach((name, i) => {
        row[String(i)] = cells[i] ?? '';
      });
      const out = rowToParentMaster(row, headerIndex);
      if (!out.success) {
        return NextResponse.json(
          { success: false, message: `Row ${r + 1}: ${out.message}` },
          { status: 400 }
        );
      }
      validatedItems.push(out.data);
    }

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid rows to import.' },
        { status: 400 }
      );
    }

    // Generate single SKU per row (no hub letter; parent live in all hubs)
    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i];
      if (!item.plant) continue;
      try {
        const sku = await generateParentSKUGlobal(item.plant);
        (validatedItems[i] as Record<string, unknown>).sku = sku;
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

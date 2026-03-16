import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CollectionMasterModel } from '@/models/collectionMaster';
import { slug } from '@/lib/utils';

const TEMPLATE_HEADERS = ['name', 'publish', 'description'];

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

function rowToDocument(
  row: Record<string, string>,
  headerIndex: Record<string, number>
): { success: true; data: Record<string, unknown> } | { success: false; message: string } {
  const get = (key: string) =>
    headerIndex[key] !== undefined ? (row[String(headerIndex[key])] ?? '').trim() : '';

  const name = get('name');
  if (!name) {
    return { success: false, message: 'name is required' };
  }

  const publishStr = get('publish');
  const publish =
    publishStr !== ''
      ? (Number(publishStr) || 0)
      : 0;
  const description = get('description') || undefined;

  const storeHippoId = `manual-${crypto.randomUUID()}`;
  const alias = slug(name);

  const data: Record<string, unknown> = {
    storeHippoId,
    name,
    type: 'manual',
    alias,
    publish: Number.isFinite(publish) ? publish : 0,
    ...(description !== undefined && description !== '' && { description }),
  };

  return { success: true, data };
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'No file provided. Use form field name "file".' },
        { status: 400 }
      );
    }
    const contentType = file.type || '';
    if (
      !contentType.includes('csv') &&
      !file.name.toLowerCase().endsWith('.csv')
    ) {
      return NextResponse.json(
        { success: false, message: 'File must be a CSV.' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: 'CSV must have a header row and at least one data row.',
        },
        { status: 400 }
      );
    }

    const headerLine = parseCsvLine(lines[0]);
    const headerIndex: Record<string, number> = {};
    TEMPLATE_HEADERS.forEach((h) => {
      const i = headerLine.findIndex(
        (cell) => cell.trim().toLowerCase() === h.toLowerCase()
      );
      if (i !== -1) headerIndex[h] = i;
    });
    if (headerIndex.name === undefined) {
      return NextResponse.json(
        { success: false, message: 'CSV must include a "name" column.' },
        { status: 400 }
      );
    }

    const documents: Record<string, unknown>[] = [];
    for (let r = 1; r < lines.length; r++) {
      const cells = parseCsvLine(lines[r]);
      const row: Record<string, string> = {};
      headerLine.forEach((name, i) => {
        row[String(i)] = cells[i] ?? '';
      });
      const out = rowToDocument(row, headerIndex);
      if (!out.success) {
        return NextResponse.json(
          { success: false, message: `Row ${r + 1}: ${out.message}` },
          { status: 400 }
        );
      }
      documents.push(out.data);
    }

    if (documents.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid rows to import.' },
        { status: 400 }
      );
    }

    const result = await CollectionMasterModel.createMany(
      documents as Parameters<typeof CollectionMasterModel.createMany>[0]
    );
    return NextResponse.json({
      success: true,
      message: `Imported ${result.insertedCount} collection(s).`,
      insertedCount: result.insertedCount,
    });
  } catch (error) {
    console.error('[collection-master] bulk-import error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Bulk import failed',
      },
      { status: 500 }
    );
  }
}

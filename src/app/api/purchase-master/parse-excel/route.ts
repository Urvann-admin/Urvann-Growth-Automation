import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// Excel upload: these columns. Overhead and type are entered in popups.
const EXCEL_COLUMNS = ['billNumber', 'productCode', 'productName', 'amount', 'quantity'] as const;
const COLUMN_MAP: Record<string, (typeof EXCEL_COLUMNS)[number]> = {
  'bill number': 'billNumber',
  'bill no': 'billNumber',
  'bill no.': 'billNumber',
  'product code': 'productCode',
  'product name': 'productName',
  'quantity': 'quantity',
  'amount': 'amount',
};

function normalizeHeader(h: string): (typeof EXCEL_COLUMNS)[number] | null {
  const key = String(h).trim().toLowerCase();
  return COLUMN_MAP[key] ?? null;
}

function rowToRecord(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [header, value] of Object.entries(row)) {
    const field = normalizeHeader(header);
    if (field == null || value === undefined || value === null || value === '') continue;
    if (field === 'quantity' || field === 'amount') {
      const n = Number(value);
      out[field] = Number.isFinite(n) ? Math.floor(n) : (field === 'quantity' ? 0 : 0);
    } else {
      out[field] = String(value).trim();
    }
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return NextResponse.json(
        { success: false, message: 'Unsupported format. Use .xlsx or .xls' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false }) as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No rows found in sheet' },
        { status: 400 }
      );
    }

    const parsed = rows.map((row) => rowToRecord(row));

    parsed.forEach((row) => {
      const q = Number(row.quantity);
      const amt = Number(row.amount);
      row.productPrice =
        Number.isFinite(q) && q > 0 && Number.isFinite(amt)
          ? Math.round(amt / q)
          : 0;
    });

    return NextResponse.json({ success: true, rows: parsed });
  } catch (error) {
    console.error('[purchase-master/parse-excel] error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to parse file',
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

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

/** One example row. potType: bag or pot. Parent is live in all hubs; SKUs are generated on import. */
const EXAMPLE_ROW = [
  'Rose',
  'Rosa',
  'Hybrid Tea',
  'Red',
  '2',
  'No',
  '6',
  'pot',
  'Beautiful flowering plant',
  'indoor-plants,outdoor-plants',
  '299',
  '',
];

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const headerLine = TEMPLATE_HEADERS.map(escapeCsvField).join(',');
  const exampleLine = EXAMPLE_ROW.map(escapeCsvField).join(',');
  const csv = [headerLine, exampleLine].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="parent-master-template.csv"',
    },
  });
}

import { NextResponse } from 'next/server';

const TEMPLATE_HEADERS = [
  'plant',
  'otherNames',
  'variety',
  'colour',
  'height',
  'mossStick',
  'size',
  'type',
  'description',
  'categories',
  'price',
  'hub',
  'seller',
];

/** One example row with placeholder values. categories is comma-separated (use quoted field in CSV). */
const EXAMPLE_ROW = [
  'Rose',
  'Rosa',
  'Hybrid Tea',
  'Red',
  '2',
  'No',
  '6',
  'Nursery Pot',
  'Beautiful flowering plant',
  'indoor-plants,outdoor-plants',
  '299',
  'Whitefield',
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

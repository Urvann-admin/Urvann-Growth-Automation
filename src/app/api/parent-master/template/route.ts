import { NextResponse } from 'next/server';

/** Keep in sync with bulk-import column order and semantics. */
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
  'tax',
  'features',
  'redirects',
  'inventory_quantity',
  'image',
];

/**
 * Example row (aligned with headers).
 * - categories: comma-separated category aliases.
 * - collection: comma-separated collection Mongo _id, alias, or name (from collection master).
 * - seller: procurement_seller_master _id.
 * - tax: optional 5, 18, 5%, or 18%.
 * - features: comma-separated; upserted into product_feature_master on import.
 * - redirects: comma-separated full URLs (e.g. from category/collection browse links).
 * - image: comma-separated http(s) URLs — each file is downloaded and re-uploaded to S3; stored URLs are S3.
 */
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
  '',
  '299',
  '',
  '399',
  '5',
  'Low maintenance',
  'https://www.urvann.com/browse/example-category-alias',
  '10',
  'https://example.com/plant-photo.jpg',
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

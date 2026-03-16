import { NextResponse } from 'next/server';

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const headerLine = ['name', 'publish', 'description']
    .map(escapeCsvField)
    .join(',');
  const exampleRow = [
    escapeCsvField('Summer Plants'),
    '1',
    escapeCsvField('Optional description'),
  ].join(',');
  const csv = [headerLine, exampleRow].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="collection-master-template.csv"',
    },
  });
}

import { NextResponse } from 'next/server';
import { CategoryModel } from '@/models/category';

export const dynamic = 'force-dynamic';

// Helper function to parse CSV (handles quoted values with commas)
function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
  if (lines.length === 0) return [];

  // Parse headers
  const headerLine = lines[0];
  const headers: string[] = [];
  let currentHeader = '';
  let inQuotes = false;
  
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(currentHeader.trim());
      currentHeader = '';
    } else {
      currentHeader += char;
    }
  }
  headers.push(currentHeader.trim());

  const rows: any[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values: string[] = [];
    let currentValue = '';
    inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    if (values.length === 0 || values.every(v => !v)) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      row[header] = value;
    });
    rows.push(row);
  }

  return rows;
}

// Helper function to parse XLSX (basic implementation - you may want to use a library)
async function parseXLSX(file: File): Promise<any[]> {
  // For now, return empty array - you'll need to install xlsx library
  // npm install xlsx
  // Then import: import * as XLSX from 'xlsx';
  throw new Error('XLSX parsing not yet implemented. Please use CSV format or install xlsx library.');
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    let rows: any[] = [];

    if (fileExtension === '.csv') {
      const text = await file.text();
      rows = parseCSV(text);
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // For XLSX, you'll need to install xlsx library
      // For now, return error
      return NextResponse.json(
        { success: false, message: 'XLSX format not yet supported. Please use CSV format.' },
        { status: 400 }
      );
      // Uncomment when xlsx library is installed:
      // rows = await parseXLSX(file);
    } else {
      return NextResponse.json(
        { success: false, message: 'Unsupported file format. Please use CSV or XLSX.' },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No data found in file' },
        { status: 400 }
      );
    }

    // Validate and process rows
    const errors: string[] = [];
    const categoriesToInsert: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      // Validate required fields
      if (!row.category || !row.alias || !row.typeOfCategory) {
        errors.push(`Row ${rowNum}: Missing required fields (category, alias, or typeOfCategory)`);
        continue;
      }

      // Parse substores
      let substores: string[] = [];
      if (row.substores) {
        substores = row.substores.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      }

      // Parse publish (accepts 0 or 1)
      let publish = false;
      if (row.publish !== undefined && row.publish !== null && row.publish !== '') {
        const publishValue = String(row.publish).trim();
        publish = publishValue === '1' || publishValue.toLowerCase() === 'true';
      }

      // Parse priorityOrder
      const priorityOrder = parseInt(row.priorityOrder) || 0;

      const categoryData = {
        category: row.category.trim(),
        alias: row.alias.trim(),
        typeOfCategory: row.typeOfCategory.trim(),
        l1Parent: row.l1Parent?.trim() || '',
        l2Parent: row.l2Parent?.trim() || '',
        l3Parent: row.l3Parent?.trim() || '',
        publish: publish,
        priorityOrder: priorityOrder,
        substores: substores,
      };

      categoriesToInsert.push(categoryData);
    }

    // Insert categories into database
    let insertedCount = 0;
    let updatedCount = 0;
    const errorsDuringInsert: string[] = [];

    for (const categoryData of categoriesToInsert) {
      try {
        // Check if category with same alias exists (alias is unique identifier)
        const existing = await CategoryModel.findByAlias(categoryData.alias);
        
        if (existing) {
          // Update existing category
          // Convert ObjectId to string if needed
          const id = existing._id ? String(existing._id) : '';
          if (!id) {
            errorsDuringInsert.push(`Failed to update ${categoryData.category}: Invalid ID`);
            continue;
          }
          await CategoryModel.update(id, categoryData);
          updatedCount++;
        } else {
          // Create new category
          await CategoryModel.create(categoryData);
          insertedCount++;
        }
      } catch (error: any) {
        errorsDuringInsert.push(`Failed to process ${categoryData.category}: ${error.message}`);
      }
    }

    const totalProcessed = insertedCount + updatedCount;
    const totalErrors = errors.length + errorsDuringInsert.length;

    return NextResponse.json({
      success: totalErrors === 0,
      message: totalErrors === 0
        ? `Successfully processed ${totalProcessed} categories (${insertedCount} inserted, ${updatedCount} updated)`
        : `Processed ${totalProcessed} categories with ${totalErrors} errors`,
      details: {
        total: rows.length,
        inserted: insertedCount,
        updated: updatedCount,
        errors: totalErrors > 0 ? [...errors, ...errorsDuringInsert] : undefined,
      },
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload file', error: error.message },
      { status: 500 }
    );
  }
}


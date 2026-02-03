import { NextResponse } from 'next/server';
import { CategoryModel } from '@/models/category';
import * as XLSX from 'xlsx';

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

// Helper function to parse XLSX
async function parseXLSX(file: File): Promise<any[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // Get the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON with header row
  const rows = XLSX.utils.sheet_to_json(worksheet, { 
    defval: '', // Default value for empty cells
    raw: false // Convert all values to strings for consistency
  });
  
  return rows;
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
      rows = await parseXLSX(file);
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

    // Upsert: if _id exists in DB then update (overwrite), else insert
    const errors: string[] = [];
    const rowsToProcess: { categoryData: any; updateData: any; rowNum: number }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.category || !row.alias || !row.typeOfCategory) {
        errors.push(`Row ${rowNum}: Missing required fields (category, alias, or typeOfCategory)`);
        continue;
      }

      const substores = row.substores
        ? String(row.substores).split(',').map((s: string) => s.trim()).filter((s: string) => s)
        : [];
      const publishVal = row.publish !== undefined && row.publish !== null && String(row.publish).trim() !== ''
        ? String(row.publish).trim()
        : '';
      const publish = publishVal === '1' || publishVal.toLowerCase() === 'true';
      const priorityOrder = parseInt(String(row.priorityOrder)) || 0;

      const categoryData: any = {
        category: String(row.category).trim(),
        alias: String(row.alias).trim(),
        typeOfCategory: String(row.typeOfCategory).trim(),
        l1Parent: row.l1Parent ? String(row.l1Parent).trim() : '',
        l2Parent: row.l2Parent ? String(row.l2Parent).trim() : '',
        l3Parent: row.l3Parent ? String(row.l3Parent).trim() : '',
        publish,
        priorityOrder,
        substores,
      };
      if (row._id && String(row._id).trim() !== '') {
        categoryData._id = String(row._id).trim();
      }

      const updateData: any = {
        category: categoryData.category,
        alias: categoryData.alias,
        typeOfCategory: categoryData.typeOfCategory,
        l1Parent: categoryData.l1Parent,
        l2Parent: categoryData.l2Parent,
        l3Parent: categoryData.l3Parent,
        publish: categoryData.publish,
        priorityOrder: categoryData.priorityOrder,
        substores: categoryData.substores,
        updatedAt: new Date(),
      };

      rowsToProcess.push({ categoryData, updateData, rowNum });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const processErrors: string[] = [];
    const { getCollection } = await import('@/lib/mongodb');
    const { ObjectId } = await import('mongodb');
    const collection = await getCollection('categoryList');

    for (const { categoryData, updateData, rowNum } of rowsToProcess) {
      try {
        const hasId = !!categoryData._id;
        if (hasId) {
          const existing = await CategoryModel.findById(categoryData._id);
          if (existing) {
            // Convert _id to ObjectId for the update query if it's a valid ObjectId string
            let queryId: string | any = categoryData._id;
            if (typeof categoryData._id === 'string' && ObjectId.isValid(categoryData._id)) {
              queryId = new ObjectId(categoryData._id);
            }
            await collection.updateOne(
              { _id: queryId },
              { $set: updateData }
            );
            updatedCount++;
          } else {
            await CategoryModel.create(categoryData);
            insertedCount++;
          }
        } else {
          await CategoryModel.create(categoryData);
          insertedCount++;
        }
      } catch (error: any) {
        console.error(`Error processing row ${rowNum} (${categoryData.alias}):`, error);
        processErrors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    const totalProcessed = insertedCount + updatedCount;
    const totalErrors = errors.length + processErrors.length;

    return NextResponse.json({
      success: totalErrors === 0,
      message: totalErrors === 0
        ? `Successfully processed ${totalProcessed} categories (${insertedCount} inserted, ${updatedCount} updated)`
        : `Processed ${totalProcessed} categories with ${totalErrors} errors`,
      details: {
        total: rows.length,
        inserted: insertedCount,
        updated: updatedCount,
        errors: totalErrors > 0 ? [...errors, ...processErrors] : undefined,
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


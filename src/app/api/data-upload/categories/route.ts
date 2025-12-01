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

    // Validate and process rows
    const errors: string[] = [];
    const categoriesToInsert: any[] = [];
    const categoriesToUpdate: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      // Check if this is an update (has _id) or new category (no _id)
      const hasId = row._id && String(row._id).trim() !== '';

      if (hasId) {
        // This is an update - only include fields that are present and not empty
        const updateData: any = {};
        const categoryId = String(row._id).trim();
        
        // Only include fields that are present in the row (excluding _id itself)
        if (row.category !== undefined && row.category !== null && String(row.category).trim() !== '') {
          updateData.category = String(row.category).trim();
        }
        if (row.alias !== undefined && row.alias !== null && String(row.alias).trim() !== '') {
          updateData.alias = String(row.alias).trim();
        }
        if (row.typeOfCategory !== undefined && row.typeOfCategory !== null && String(row.typeOfCategory).trim() !== '') {
          updateData.typeOfCategory = String(row.typeOfCategory).trim();
        }
        if (row.l1Parent !== undefined && row.l1Parent !== null && String(row.l1Parent).trim() !== '') {
          updateData.l1Parent = String(row.l1Parent).trim();
        }
        if (row.l2Parent !== undefined && row.l2Parent !== null && String(row.l2Parent).trim() !== '') {
          updateData.l2Parent = String(row.l2Parent).trim();
        }
        if (row.l3Parent !== undefined && row.l3Parent !== null && String(row.l3Parent).trim() !== '') {
          updateData.l3Parent = String(row.l3Parent).trim();
        }
        if (row.publish !== undefined && row.publish !== null && String(row.publish).trim() !== '') {
          const publishValue = String(row.publish).trim();
          updateData.publish = publishValue === '1' || publishValue.toLowerCase() === 'true';
        }
        if (row.priorityOrder !== undefined && row.priorityOrder !== null && String(row.priorityOrder).trim() !== '') {
          updateData.priorityOrder = parseInt(String(row.priorityOrder)) || 0;
        }
        if (row.substores !== undefined && row.substores !== null && String(row.substores).trim() !== '') {
          updateData.substores = String(row.substores).split(',').map((s: string) => s.trim()).filter((s: string) => s);
        }

        if (Object.keys(updateData).length === 0) {
          errors.push(`Row ${rowNum}: No fields to update (all fields are empty)`);
          continue;
        }

        categoriesToUpdate.push({
          _id: categoryId,
          updateData: updateData
        });
      } else {
        // This is a new category - validate required fields
        if (!row.category || !row.alias || !row.typeOfCategory) {
          errors.push(`Row ${rowNum}: Missing required fields (category, alias, or typeOfCategory)`);
          continue;
        }

        // Parse substores
        let substores: string[] = [];
        if (row.substores) {
          substores = String(row.substores).split(',').map((s: string) => s.trim()).filter((s: string) => s);
        }

        // Parse publish (accepts 0 or 1)
        let publish = false;
        if (row.publish !== undefined && row.publish !== null && String(row.publish).trim() !== '') {
          const publishValue = String(row.publish).trim();
          publish = publishValue === '1' || publishValue.toLowerCase() === 'true';
        }

        // Parse priorityOrder
        const priorityOrder = parseInt(String(row.priorityOrder)) || 0;

        const categoryData: any = {
          category: String(row.category).trim(),
          alias: String(row.alias).trim(),
          typeOfCategory: String(row.typeOfCategory).trim(),
          l1Parent: row.l1Parent ? String(row.l1Parent).trim() : '',
          l2Parent: row.l2Parent ? String(row.l2Parent).trim() : '',
          l3Parent: row.l3Parent ? String(row.l3Parent).trim() : '',
          publish: publish,
          priorityOrder: priorityOrder,
          substores: substores,
        };

        // Include _id if provided (even for new categories)
        if (row._id && String(row._id).trim() !== '') {
          categoryData._id = String(row._id).trim();
        }

        categoriesToInsert.push(categoryData);
      }
    }

    // Insert new categories into database
    let insertedCount = 0;
    const errorsDuringInsert: string[] = [];

    for (const categoryData of categoriesToInsert) {
      try {
        // Check if category with same _id exists (if _id is provided)
        if (categoryData._id) {
          const existingById = await CategoryModel.findById(categoryData._id);
          if (existingById) {
            errorsDuringInsert.push(`Category with _id "${categoryData._id}" already exists. Use _id field to update existing categories.`);
            continue;
          }
        }
        
        // Check if category with same alias exists (alias is unique identifier)
        const existing = await CategoryModel.findByAlias(categoryData.alias);
        
        if (existing) {
          errorsDuringInsert.push(`Category with alias "${categoryData.alias}" already exists. Use _id field to update existing categories.`);
          continue;
        }
        
        // Create new category
        await CategoryModel.create(categoryData);
        insertedCount++;
      } catch (error: any) {
        console.error(`Error processing category ${categoryData.alias}:`, error);
        errorsDuringInsert.push(`Failed to process ${categoryData.category}: ${error.message}`);
      }
    }

    // Update existing categories
    let updatedCount = 0;
    const errorsDuringUpdate: string[] = [];

    for (const { _id, updateData } of categoriesToUpdate) {
      try {
        // Verify the category exists using the custom string _id field
        const existing = await CategoryModel.findById(_id);
        
        if (!existing) {
          errorsDuringUpdate.push(`Category with _id "${_id}" not found`);
          continue;
        }
        
        // Perform partial update using the collection directly (since _id is a string, not MongoDB ObjectId)
        const { getCollection } = await import('@/lib/mongodb');
        const collection = await getCollection('categoryList');
        const updateResult = await collection.updateOne(
          { _id: _id },
          { $set: { ...updateData, updatedAt: new Date() } }
        );
        
        // Check if the update actually matched and modified a document
        if (updateResult.matchedCount === 0) {
          errorsDuringUpdate.push(`Failed to update category with _id "${_id}": Document not found`);
          continue;
        }
        
        if (updateResult.modifiedCount === 0) {
          // Document was matched but not modified (data might be the same)
          // This is not necessarily an error, but we'll still count it as updated
          console.log(`Category ${_id} was matched but not modified (data unchanged)`);
        }
        
        updatedCount++;
      } catch (error: any) {
        console.error(`Error updating category ${_id}:`, error);
        errorsDuringUpdate.push(`Failed to update category with _id "${_id}": ${error.message}`);
      }
    }

    const totalProcessed = insertedCount + updatedCount;
    const totalErrors = errors.length + errorsDuringInsert.length + errorsDuringUpdate.length;

    return NextResponse.json({
      success: totalErrors === 0,
      message: totalErrors === 0
        ? `Successfully processed ${totalProcessed} categories (${insertedCount} inserted, ${updatedCount} updated)`
        : `Processed ${totalProcessed} categories with ${totalErrors} errors`,
      details: {
        total: rows.length,
        inserted: insertedCount,
        updated: updatedCount,
        errors: totalErrors > 0 ? [...errors, ...errorsDuringInsert, ...errorsDuringUpdate] : undefined,
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


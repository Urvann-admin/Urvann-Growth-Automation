// Excel export utilities

import * as XLSX from 'xlsx';
import { FrequentlyBoughtItem, UniqueSku } from '@/types/frequentlyBought';

/**
 * Export frequently bought together data to Excel
 */
export function exportFrequentlyBoughtToExcel(data: FrequentlyBoughtItem[]): void {
  // Prepare data for Excel
  const excelData = data.map((item) => {
    const row: Record<string, string> = {
      'SKU': item.sku,
      'Product Name': item.name,
    };

    // Add top 6 paired product SKUs only (no names)
    for (let i = 0; i < 6; i++) {
      const pairedProduct = item.topPaired[i];
      row[`Paired SKU ${i + 1}`] = pairedProduct ? pairedProduct.sku : '';
    }

    return row;
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const colWidths = [
    { wch: 15 },  // SKU
    { wch: 40 },  // Product Name
    { wch: 15 },  // Paired SKU 1
    { wch: 15 },  // Paired SKU 2
    { wch: 15 },  // Paired SKU 3
    { wch: 15 },  // Paired SKU 4
    { wch: 15 },  // Paired SKU 5
    { wch: 15 },  // Paired SKU 6
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Frequently Bought Together');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const filename = `frequently_bought_together_${date}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
}

/**
 * Export all SKUs data to Excel
 */
export function exportAllSkusToExcel(data: UniqueSku[]): void {
  // Prepare data for Excel
  const excelData = data.map((item) => {
    const isAvailable = String(item.publish || '0').trim() === '1' && (item.inventory || 0) > 0;
    
    return {
      'SKU': item.sku,
      'Product Name': item.name || '',
      'Substore': item.substore || '',
      'Order Count': item.orderCount || 0,
      'Available': isAvailable ? 'Yes' : 'No',
      'Publish Status': item.publish || '0',
      'Inventory': item.inventory || 0,
    };
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const colWidths = [
    { wch: 15 },  // SKU
    { wch: 40 },  // Product Name
    { wch: 15 },  // Substore
    { wch: 12 },  // Order Count
    { wch: 12 },  // Available
    { wch: 15 },  // Publish Status
    { wch: 12 },  // Inventory
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'All SKUs');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const filename = `all_skus_${date}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
}


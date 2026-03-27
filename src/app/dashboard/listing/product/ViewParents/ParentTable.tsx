'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { ParentMaster } from '@/models/parentMaster';

interface ParentTableProps {
  items: ParentMaster[];
  onEdit: (item: ParentMaster) => void;
  onDelete: (item: ParentMaster) => void;
}

function productTypeLabel(row: ParentMaster): string {
  const t = row.productType;
  if (!t || t === 'parent') return 'Parent';
  if (t === 'growing_product') return 'Growing';
  return 'Consumable';
}

function displayProductCode(row: ParentMaster): string {
  const pc = row.productCode?.trim();
  if (pc) return pc;
  const t = row.productType;
  if (t === 'growing_product' || t === 'consumable') {
    const leg = (row.parentSku ?? '').trim();
    if (leg && row.sku) return String(row.sku).trim();
    if (row.sku) return String(row.sku).trim();
  }
  if (!t || t === 'parent') return row.sku?.trim() ?? '—';
  return '—';
}

function displayParentLink(row: ParentMaster): string {
  const t = row.productType;
  if (!t || t === 'parent') return '—';
  if (row.productCode?.trim() && row.sku?.trim()) return String(row.sku).trim();
  return (row.parentSku ?? '').trim() || '—';
}

export function ParentTable({ items, onEdit, onDelete }: ParentTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Type</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Name</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Product code</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Parent SKU</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Final name</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Selling price</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Listing price</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Categories</th>
            <th className="text-right py-3 px-3 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={String(row._id)} className="border-b border-slate-100 hover:bg-slate-50/50">
              <td className="py-3 px-3 text-slate-700 whitespace-nowrap">{productTypeLabel(row)}</td>
              <td className="py-3 px-3 text-slate-900">{row.plant ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600 font-mono text-xs">{displayProductCode(row)}</td>
              <td className="py-3 px-3 text-slate-600 font-mono text-xs">{displayParentLink(row)}</td>
              <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate" title={row.finalName}>
                {row.finalName ?? '—'}
              </td>
              <td className="py-3 px-3 text-slate-600">{(row as any).sellingPrice ?? row.price ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">{row.listing_price ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">
                {Array.isArray(row.categories) ? row.categories.length : 0}
              </td>
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                    aria-label="Edit product"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

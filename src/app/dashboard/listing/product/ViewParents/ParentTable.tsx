'use client';

import { Check, X, Pencil, Trash2 } from 'lucide-react';
import type { ParentMaster } from '@/models/parentMaster';

interface ParentTableProps {
  items: ParentMaster[];
  onEdit: (item: ParentMaster) => void;
  onDelete: (item: ParentMaster) => void;
}

export function ParentTable({ items, onEdit, onDelete }: ParentTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-3 font-semibold text-slate-700">SKU</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Plant</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Final name</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Price</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Inventory</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Publish</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Categories</th>
            <th className="text-right py-3 px-3 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={String(row._id)} className="border-b border-slate-100 hover:bg-slate-50/50">
              <td className="py-3 px-3 font-mono text-xs text-slate-600">{row.sku ?? '—'}</td>
              <td className="py-3 px-3 text-slate-900">{row.plant ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate" title={row.finalName}>
                {row.finalName ?? '—'}
              </td>
              <td className="py-3 px-3 text-slate-600">{row.price ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">{row.inventoryQuantity ?? '—'}</td>
              <td className="py-3 px-3">
                {row.publish === 'published' ? (
                  <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} aria-label="Published" />
                ) : (
                  <X className="w-5 h-5 text-slate-400" strokeWidth={2.5} aria-label="Draft" />
                )}
              </td>
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

'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { PurchaseMaster } from '@/models/purchaseMaster';

interface PurchaseTableProps {
  purchases: PurchaseMaster[];
  onEdit: (p: PurchaseMaster) => void;
  onDelete: (p: PurchaseMaster) => void;
}

export function PurchaseTable({ purchases, onEdit, onDelete }: PurchaseTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Bill no.</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Product code</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Product name</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Qty</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Price</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Amount</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Overhead</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Type</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Parent SKU</th>
            <th className="text-right py-3 px-3 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((p) => (
            <tr key={String(p._id)} className="border-b border-slate-100 hover:bg-slate-50/50">
              <td className="py-3 px-3 text-slate-900">{p.billNumber ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">{p.productCode ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">{p.productName ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">{p.quantity ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">{p.productPrice ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">{p.amount ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600 text-xs">
                {p.overhead != null
                  ? `${p.overhead.allocatedAmount ?? '—'} (${p.overhead.allocationMethod ?? '—'})`
                  : '—'}
              </td>
              <td className="py-3 px-3 text-slate-600 text-xs">
                {[p.type?.listing, p.type?.revival, p.type?.growth, p.type?.consumers]
                  .filter((v) => v != null)
                  .length > 0
                  ? `L:${p.type?.listing ?? '-'} R:${p.type?.revival ?? '-'} G:${p.type?.growth ?? '-'} C:${p.type?.consumers ?? '-'}`
                  : '—'}
              </td>
              <td className="py-3 px-3 text-slate-600 font-mono text-xs">{p.parentSku ?? '—'}</td>
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-emerald-600"
                    aria-label="Edit"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete"
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

'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { ProcurementSellerMaster } from '@/models/procurementSellerMaster';

interface SellerTableProps {
  sellers: ProcurementSellerMaster[];
  onEdit: (seller: ProcurementSellerMaster) => void;
  onDelete: (seller: ProcurementSellerMaster) => void;
}

export function SellerTable({
  sellers,
  onEdit,
  onDelete,
}: SellerTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-3 font-semibold text-slate-700">
              Seller name
            </th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">
              Place
            </th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">
              Multiplication factor
            </th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">
              Bill no.
            </th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">
              Phone number
            </th>
            <th className="text-right py-3 px-3 font-semibold text-slate-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sellers.map((seller) => (
            <tr
              key={String(seller._id)}
              className="border-b border-slate-100 hover:bg-slate-50/50"
            >
              <td className="py-3 px-3 text-slate-900">
                {seller.seller_name ?? '—'}
              </td>
              <td className="py-3 px-3 text-slate-600">
                {seller.place ?? '—'}
              </td>
              <td className="py-3 px-3 text-slate-600">
                {seller.multiplicationFactor != null
                  ? seller.multiplicationFactor
                  : '—'}
              </td>
              <td className="py-3 px-3 text-slate-600 font-mono text-xs">
                {seller.billNo ?? '—'}
              </td>
              <td className="py-3 px-3 text-slate-600">
                {seller.phoneNumber ?? '—'}
              </td>
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(seller)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                    aria-label="Edit seller"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(seller)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label="Delete seller"
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

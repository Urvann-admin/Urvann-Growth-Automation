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
        <thead className="bg-slate-50/80">
          <tr className="border-b border-slate-200">
            <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Seller name
            </th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Vendor code
            </th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Vendor place
            </th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Multiplication factor
            </th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Product type
            </th>
            <th className="text-left py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Phone number
            </th>
            <th className="text-right py-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sellers.map((seller) => (
            <tr
              key={String(seller._id)}
              className="hover:bg-pink-50/30 transition-colors"
            >
              <td className="py-3.5 px-4 font-medium text-slate-900">
                {seller.seller_name ?? '—'}
              </td>
              <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                {seller.vendorCode ?? '—'}
              </td>
              <td className="py-3.5 px-4 text-slate-600">
                {seller.place ?? '—'}
              </td>
              <td className="py-3.5 px-4 text-slate-600">
                {seller.multiplicationFactor != null
                  ? seller.multiplicationFactor
                  : '—'}
              </td>
              <td className="py-3.5 px-4 text-slate-600">
                {Array.isArray(seller.productType) && seller.productType.length > 0
                  ? seller.productType.join(', ')
                  : '—'}
              </td>
              <td className="py-3.5 px-4 text-slate-600">
                {seller.phoneNumber ?? '—'}
              </td>
              <td className="py-3.5 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(seller)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-pink-50 hover:text-[#E6007A] transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                    aria-label="Edit seller"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(seller)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30"
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

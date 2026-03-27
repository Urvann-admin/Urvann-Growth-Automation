'use client';

import { Pencil, Trash2, Plus } from 'lucide-react';
import type { PurchaseMaster, PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { CustomSelect, type SelectOption } from '../../components/CustomSelect';

export type TypeSlug = 'listing' | 'revival' | 'growth' | 'consumers';

const TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select' },
  { value: 'listing', label: 'Listing' },
  { value: 'revival', label: 'Revival' },
  { value: 'growth', label: 'Growth' },
  { value: 'consumers', label: 'Consumers' },
];

function typeSlugToBreakdown(slug: TypeSlug, quantity: number): PurchaseTypeBreakdown {
  return { [slug]: quantity };
}

interface ProcurementSellerLookup {
  _id: string;
  seller_name: string;
  vendorCode?: string;
}

interface PurchaseTableProps {
  purchases: PurchaseMaster[];
  onEdit: (p: PurchaseMaster) => void;
  onDelete: (p: PurchaseMaster) => void;
  onPendingType?: (p: PurchaseMaster, type: PurchaseTypeBreakdown | Record<string, never>) => void;
  /** Resolve stored seller (Mongo id) to label for display */
  procurementSellers?: ProcurementSellerLookup[];
}

function getListingDisplay(p: PurchaseMaster): string {
  const t = p.type;
  if (!t?.listing || t.listing <= 0) return '—';
  const typeSum =
    (Number(t?.listing ?? 0) || 0) +
    (Number(t?.revival ?? 0) || 0) +
    (Number(t?.growth ?? 0) || 0) +
    (Number(t?.consumers ?? 0) || 0);
  const isFlagMode = typeSum <= 1;
  const total = isFlagMode ? (Number(p.quantity) || 0) : (Number(t.listing) || 0);
  const listed = Number(p.listed_quantity ?? 0) || 0;
  const remaining = Math.max(0, total - listed);
  return `${listed} / ${total} (${remaining} left)`;
}

function getTypeSlug(p: { type?: { listing?: number; revival?: number; growth?: number; consumers?: number } }): TypeSlug | null {
  const t = p.type;
  if (!t) return null;
  const has = (v: number | undefined) => v != null && Number(v) > 0;
  if (has(t.listing)) return 'listing';
  if (has(t.revival)) return 'revival';
  if (has(t.growth)) return 'growth';
  if (has(t.consumers)) return 'consumers';
  return null;
}

function formatNum(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n));
}

function formatSellerCell(
  sellerRef: string | undefined,
  lookup: ProcurementSellerLookup[] | undefined
): string {
  if (!sellerRef?.trim()) return '—';
  const id = sellerRef.trim();
  const row = lookup?.find((s) => s._id === id);
  if (row) {
    return row.vendorCode ? `${row.seller_name} (${row.vendorCode})` : row.seller_name || id;
  }
  return id;
}

export function PurchaseTable({
  purchases,
  onEdit,
  onDelete,
  onPendingType,
  procurementSellers,
}: PurchaseTableProps) {
  const handleTypeChange = (p: PurchaseMaster, slug: TypeSlug | '') => {
    if (!onPendingType || !p._id) return;
    onPendingType(p, slug ? typeSlugToBreakdown(slug as TypeSlug, Number(p.quantity) || 0) : {});
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-3 font-semibold text-slate-700">S.No</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Bill no.</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Product code</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Product name</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Seller</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Qty</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Price</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Amount</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Overhead</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Type</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Listed</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Parent SKU</th>
            <th className="text-right py-3 px-3 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((p, index) => {
            const id = String(p._id);
            return (
            <tr key={id} className="border-b border-slate-100 hover:bg-slate-50/50">
              <td className="py-3 px-3 text-slate-600">{index + 1}</td>
              <td className="py-3 px-3 text-slate-900">{p.billNumber ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">{p.productCode ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600">{p.productName ?? '—'}</td>
              <td className="py-3 px-3 text-slate-600 text-xs">
                {formatSellerCell(p.seller, procurementSellers)}
              </td>
              <td className="py-3 px-3 text-slate-600">{formatNum(p.quantity)}</td>
              <td className="py-3 px-3 text-slate-600">{formatNum(p.productPrice)}</td>
              <td className="py-3 px-3 text-slate-600">{formatNum(p.amount)}</td>
              <td className="py-3 px-3 text-slate-600 text-xs">
                {p.overhead != null
                  ? `${formatNum(p.overhead.allocatedAmount)} (${p.overhead.allocationMethod ?? '—'})`
                  : '—'}
              </td>
              <td className="py-3 px-3">
                <div className="min-w-[120px]">
                  <CustomSelect
                    value={getTypeSlug(p) ?? ''}
                    onChange={(val) => handleTypeChange(p, val as TypeSlug | '')}
                    options={TYPE_OPTIONS}
                    placeholder="Select"
                    disabled={!onPendingType}
                    searchable={false}
                    hideIndicatorWhenSelected
                  />
                </div>
              </td>
              <td className="py-3 px-3 text-slate-600 text-xs">
                {getListingDisplay(p)}
              </td>
              <td className="py-3 px-3 text-slate-600 font-mono text-xs">
                <span className="inline-flex items-center gap-1.5">
                  {p.parentSku ?? '—'}
                  {p.parentSku && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E6007A] text-white" aria-hidden>
                      <Plus className="w-3 h-3" />
                    </span>
                  )}
                </span>
              </td>
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-[#330033]/10 hover:text-[#330033]"
                    aria-label="Edit"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
